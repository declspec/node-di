"use strict";

var $ControllerProvider = require("./controller");

module.exports = function(di) {
    var ndi = di("ndi", []);
    
    // Register core components
    ndi.provider("$controller", $ControllerProvider);
    
    return ndi;
};