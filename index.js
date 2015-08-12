"use strict";

var diModule = require("./di-module"),
    injector = require("./injector");
    
module.exports = {
    module:     diModule,
    bootstrap:  function(modules) {
        modules = modules || [];
        return injector(modules, false); // turn off strict di, doubt nodejs code will be minified
    }
};