"use strict";

var diModule = require("./lib/di-module"),
    injector = require("./lib/injector"),
    ndi      = require("./lib/core")(diModule);
    
module.exports = {
    module:     diModule,
    injector: 	injector
};

