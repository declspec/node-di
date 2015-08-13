"use strict";

// Dumbed down version of AngularJS's HashMap
// https://github.com/angular/angular.js/blob/master/src/apis.js

module.exports = HashMap;

function HashMap(array) {
	var uid = 0;
	this.nextUid = function() {
		return ++uid;
	};
    array.forEach(this.put, this);
};

HashMap.prototype = (function() {	
	return {
		/**
		 * Store key value pair
		 * @param key key to store can be any type
		 * @param value value to store can be any type
		 */
		put: function(key, value) {
			this[hashKey(key, this.nextUid)] = value;
		},

		/**
		 * @param key
		 * @returns {Object} the value for the key
		 */
		get: function(key) {
			return this[hashKey(key, this.nextUid)];
		},

		/**
		 * Remove the key/value pair
		 * @param key
		 */
		remove: function(key) {
			var value = this[key = hashKey(key, this.nextUid)];
			delete this[key];
			return value;
		}
	};
	
	function hashKey(obj, nextUidFn) {
		var key = obj && obj.$$hashKey;

		if (key) {
			return typeof(key) === "function"
				? obj.$$hashKey()
				: key;
		}

		var objType = typeof(obj);
		return (objType == 'function' || (objType == 'object' && obj !== null))
			? (obj.$$hashkey = objType + ":" + nextUidFn())
			: objType + ":" + obj;
	};
}());
