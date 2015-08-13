"use strict";

var diModule = require("./lib/di-module"),
    injector = require("./lib/injector");

// Initialize all the core 'di' functionality    
require("./lib/di/core")(diModule);
    
module.exports = {
    module:     diModule,
    injector: 	injector
};

