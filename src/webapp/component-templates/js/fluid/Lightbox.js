/*
 Fluid Project

 Copyright (c) 2006, 2007 University of Toronto. All rights reserved.

 Licensed under the Educational Community License, Version 1.0 (the "License"); 
 you may not use this file except in compliance with the License. 
 You may obtain a copy of the License at 
 
 http://www.opensource.org/licenses/ecl1.php 
 
 Unless required by applicable law or agreed to in writing, software 
 distributed under the License is distributed on an "AS IS" BASIS, 
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 See the License for the specific language governing permissions and 
 limitations under the License.

 Adaptive Technology Resource Centre, University of Toronto
 130 St. George St., Toronto, Ontario, Canada
 Telephone: (416) 978-4360
*/


dojo.provide("fluid.Lightbox");

dojo.require("dijit.base.Widget");

(function() {
	fluid.states = {
		defaultClass:"image-container-default",
		focusedClass:"image-container-selected",
		draggingClass:"image-container-dragging"
	};		
})();

dojo.declare(
	"fluid.Lightbox",	// class name
	dijit.base.Widget,
	{
		
		// the lightbox-reorderable DOM element that is currently active
		activeItem: null,
		
		gridLayoutHandler: null,

		utilities: null,
		
		/**
		 * Return the element within the item that should receive focus.
		 * 
		 * NOTE: The lightbox currently assumes that items will have an anchor, and that this anchor
		 * should receive focus so that it can be activated with an 'enter' keypress. This function
		 * currently returns the first anchor in the item.
		 * 
		 * @param {Object} item
		 * @return {Object} The element that should receive focus in the specified item.
		 */
		getElementToFocus: function(item) {
			// TODO: generalize this to return any specified element specified on construction of 
			// Lightbox
			return item.getElementsByTagName("a")[0];
		},


		buildRendering: function() {
			// note: this should really be informed of the Id by the gallery, to be able
			// to handle multiple lightboxes
			this.domNode = dojo.byId("gallery:::gallery-thumbs:::");
		},

		postCreate: function () {
			// Dojo calls this function after constructing the object.
			
			// Connect the listeners that handle keypresses and focusing
			dojo.connect(this.domNode, "keypress", this, "handleArrowKeyPress");
			dojo.connect(this.domNode, "keydown", this, "handleKeyDown");
			dojo.connect(this.domNode, "keyup", this, "handleKeyUp");
			dojo.connect(this.domNode, "onfocus", this, "selectActiveItem");
			dojo.connect(this.domNode, "onblur", this, "setActiveItemToDefaultState");
			dojo.connect(window, "onresize", this, "handleWindowResizeEvent");
			
			// remove whitespace from the tree before passing it to the grid handler
			this.utilities = new Utilities();
			this.utilities.removeNonElementNodes(this.domNode);

			this.gridLayoutHandler = new GridLayoutHandler();
			this.gridLayoutHandler.setGrid(this.domNode);
			
		}, // end postCreate
		
		/**
		 * Changes the current focus to the specified item.
		 * @param {Object} anItem
		 */
		focusItem: function(anItem) {			
			this.setActiveItemToDefaultState();
						
			this.activeItem = anItem;			
			
			dojo.removeClass (this.activeItem, fluid.states.defaultClass);
			dojo.addClass (this.activeItem, fluid.states.focusedClass);
			this.getElementToFocus(this.activeItem).focus();
		}, //end focus
		
		/**
		 * Changes focus to the active item.
		 */
		selectActiveItem: function() {
			if (!this.activeItem) {
				this.activeItem = this.firstElement(this.domNode);
			}
			this.focusItem(this.activeItem);
		},
		
		setActiveItemToDefaultState: function() {
			if (this.activeItem) {
				dojo.removeClass (this.activeItem, fluid.states.focusedClass);
				dojo.addClass (this.activeItem, fluid.states.defaultClass);
			}
		},
		
		handleKeyDown: function (evt) {
			var key = evt.keyCode;
			if (key == dojo.keys.CTRL) {
				dojo.removeClass(this.activeItem, fluid.states.focusedClass);
				dojo.addClass(this.activeItem, fluid.states.draggingClass);
				dojo.stopEvent(evt);
			}
		}, // end handleKeyDown
		
		handleKeyUp: function (evt) {
			var key = evt.keyCode;
			if (key == dojo.keys.CTRL) {
				dojo.removeClass(this.activeItem, fluid.states.draggingClass);
				dojo.addClass(this.activeItem, fluid.states.focusedClass);
				dojo.stopEvent(evt);
			}		
		}, // end handleKeyUp
		
		handleArrowKeyPress: function (evt){
			switch (key = evt.keyCode) {
			case dojo.keys.DOWN_ARROW: {
				this.handleDownArrow(evt.ctrlKey);								
				dojo.stopEvent(evt);
				break;
			}
			case dojo.keys.UP_ARROW: {
				this.handleUpArrow(evt.ctrlKey);								
				dojo.stopEvent(evt);
				break;
			}
			case dojo.keys.LEFT_ARROW: {
				this.handleLeftArrow(evt.ctrlKey);								
				dojo.stopEvent(evt);
				break;
			}
			case dojo.keys.RIGHT_ARROW: {
				this.handleRightArrow(evt.ctrlKey);								
				dojo.stopEvent(evt);
				break;
			}
			default:
			}
		}, // end handleArrowKeyPress
	
		handleUpArrow: function (isCtrl) {
			var itemAboveInfo = this.gridLayoutHandler.getItemAbove(this.activeItem);
			
			// if we wrap around, then we want to insert after the item 'above' 
			if (itemAboveInfo.hasWrapped) {
				this._changeFocusOrMove(isCtrl, itemAboveInfo.item, "after");	
			} else {
				this._changeFocusOrMove(isCtrl, itemAboveInfo.item, "before");	
			}
		},

		handleDownArrow: function (isCtrl) {
			var itemBelowInfo = this.gridLayoutHandler.getItemBelow(this.activeItem);
			
			// if we wrap around, then we want to insert before the item 'below' 
			if (itemBelowInfo.hasWrapped) {
				this._changeFocusOrMove(isCtrl, itemBelowInfo.item, "before");
			} else {
				this._changeFocusOrMove(isCtrl, itemBelowInfo.item, "after");
			}	
		},
		
		handleRightArrow: function(isCtrl) {
			var nextRightSibling = this.nextElement(this.activeItem);
			var placementPosition;
			
			if (nextRightSibling) {
				placementPosition = "after";
			} else {
				// if current focus image is the last, change focus to first thumbnail
				nextRightSibling = this.firstElement(this.activeItem.parentNode);
				placementPosition = "before";
			}
			
			this._changeFocusOrMove(isCtrl, nextRightSibling, placementPosition);
		}, // end handleRightArrow
		
		handleLeftArrow: function(isCtrl) {
			var nextLeftSibling = this.previousElement(this.activeItem);
			var placementPosition;
			
			if (nextLeftSibling) {
				placementPosition = "before";
			} else {
				// if current focus image is the first, the next sibling is the last sibling
				nextLeftSibling = this.lastElement(this.activeItem.parentNode);
				placementPosition = "after";
			}
			
			this._changeFocusOrMove(isCtrl, nextLeftSibling, placementPosition);
		}, // end handleLeftArrow
		
		_changeFocusOrMove: function(shouldMove, refSibling, placementPosition) {
			if (shouldMove) {
				dojo.place(this.activeItem, refSibling, placementPosition);
				this.getElementToFocus(this.activeItem).focus();
			} else {
				this.focusItem(refSibling);
			}		
		},
		
		nextElement: function(node) {
			while (node){
				node = node.nextSibling;
				if (this.isElement(node)) {
					return (node); 
				}
			}
			return node;
		}, // end nextElement
		
		previousElement: function(node) {
			while (node){
				node = node.previousSibling;
				if (this.isElement(node)) {
					return (node); 
				}
			}
			return node;
		}, // end previousElement
		
		firstElement: function(nodeParent) {
			var node = nodeParent.firstChild;
			
			if (this.isElement(node)) {
				return node;
			}
			
			return this.nextElement(node);
		},
		
		lastElement: function(nodeParent) {
			var node = nodeParent.lastChild;
			
			if (this.isElement(node)) {
				return node;
			}
			
			return this.previousElement(node);
		},
		
		isElement: function(node) {
			return node && node.nodeType == 1;
		},
		
		handleWindowResizeEvent: function(resizeEvent) {
		}
	}
);

function GridLayoutHandler() {
	
	this.numOfColumnsInGrid = 0
	this.grid = null;
	
	this.setGrid = function (aGrid) {
		this.grid = aGrid;
		this.updateGridWidth();
	};
	
	this.updateGridWidth = function () {
		var firstItemY = dojo.coords(this.grid.childNodes[0]).y;

		var i = 1;
		while (i < this.grid.childNodes.length) {		
			if (dojo.coords(this.grid.childNodes[i]).y > firstItemY) {
				this.numOfColumnsInGrid = i;
				break;
			}
			i++;
		}
	};
	
	this.getRightSiblingAndPosition = function (item) {
		var nextIndex = dojo.indexOf(this.grid.childNodes, item) + 1;
		var pos = "after";
		if (nextIndex >= this.grid.childNodes.length) {
			nextIndex = 0;
			pos = "before";
		}
		
		return {item: this.grid.childNodes[nextIndex], position: pos};
	},
	
	this.getItemBelow = function (item) {
		var curIndex = dojo.indexOf(this.grid.childNodes, item);
		var belowIndex = curIndex+this.numOfColumnsInGrid;
		var hasWrapped = false;
		
		if (belowIndex >= this.grid.childNodes.length) {
			hasWrapped = true;
			belowIndex = belowIndex % this.numOfColumnsInGrid;
		}
		return {item: this.grid.childNodes[belowIndex], hasWrapped: hasWrapped};
	};
	
	this.getItemAbove = function (item) {
		var curIndex = dojo.indexOf(this.grid.childNodes, item);
		var aboveIndex = curIndex-this.numOfColumnsInGrid;
		var hasWrapped = false;
		
		if (aboveIndex < 0) {
			hasWrapped = true;
			var itemsInLastRow = this.grid.childNodes.length % this.numOfColumnsInGrid;
			if (curIndex  >= itemsInLastRow) {
				aboveIndex = curIndex + this.grid.childNodes.length - itemsInLastRow
					- this.numOfColumnsInGrid;
			} else {
				aboveIndex = curIndex + this.grid.childNodes.length - itemsInLastRow;
			}
		}
		
		return {item: this.grid.childNodes[aboveIndex], hasWrapped: hasWrapped};
	};
	
}

function Utilities() {
	this.removeNonElementNodes = function(rootNode) {
		var currChild = rootNode.firstChild;
		var nextSibling = currChild.nextSibling;
		if (currChild.nodeType != 1) {
			rootNode.removeChild(currChild);
		}
		while (nextSibling){
			currChild = nextSibling;
			nextSibling = currChild.nextSibling;
			if (currChild.nodeType != 1) {
				rootNode.removeChild(currChild);
			}			
		} 
	}
}

