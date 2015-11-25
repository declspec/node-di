"use strict";

module.exports = function coreModule(diModule) {
    var di = diModule("di", []);
    
    di.provider("$controller", require("./di/controller"));
    di.provider("$filter", require("./di/filter"));
    di.factory("$q", require("./di/q"));
    
    return di;
};