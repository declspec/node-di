"use strict";

// Rather than using AngularJS's 'q.js' (https://github.com/angular/angular.js/blob/master/src/ng/q.js)
// I decided to take a shortcut and implement a really simple wrapper around Kris Kowal's Q library
var Q = require("q");

module.exports = function(mod) {
    mod.provider("$q", $QProvider);
};

function $QProvider() {
    this.$get = function() {
        return Q;
    };
}