"use strict";

var $ControllerProvider = require("./controller");

module.exports = function coreModule(diModule) {
    var di = diModule("di", []);
    
    // Register core components
    di.provider("$controller", $ControllerProvider);
    
    return di;
};