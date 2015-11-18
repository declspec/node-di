"use strict";

var diModule = require("./lib/di-module"),
    injector = require("./lib/modular-injector");

// Initialize all the core 'di' functionality    
require("./lib/core")(diModule);
    
module.exports = {
    module:     diModule,
    injector: 	injector
};
