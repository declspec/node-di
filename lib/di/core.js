"use strict";

var $ControllerProvider = require("./controller");

module.exports = function(diModule) {
    var di = diModule("di", []);
    
    // Register core components
    ndi.provider("$controller", $ControllerProvider);
    
    return ndi;
};