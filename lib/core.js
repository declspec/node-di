"use strict";

module.exports = function coreModule(diModule) {
    var di = diModule("di", []);
    
    // Register core components
    require("./di/controller")(di);
    require("./di/q")(di);
    require("./di/http")(di);

    return di;
};