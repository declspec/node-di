"use strict";

module.exports = function coreModule(diModule) {
    var di = diModule("di", []);
    
    // Register core components
    require("./di/controller")(di);
    require("./di/filter")(di);
    require("./di/q")(di);
    // not yet finished require("./di/http")(di);

    return di;
};