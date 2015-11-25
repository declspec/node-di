"use strict";

// TODO: Use a less "volatile" _extend function
var util    = require("util"),
    extend  = util._extend;

var CNTRL_REG = /^(\S+)$/;

module.exports = $ControllerProvider;

function $ControllerProvider() {
    var controllers = {};
    
    this.register = function(name, constructor) {
        if ("object" === typeof(name)) 
            extend(controllers, name);
        else
            controllers[name] = constructor;
    };
    
    this.$get = ["$injector", function($injector) {
        return function(expression, locals) {
            if ("string" === typeof(expression)) {
                var match = expression.match(CNTRL_REG),
                    constructor = match && match[1];
                    
                if (match === null)
                    throw new Error(util.format("Badly formed controller string '%s'. Must match `__name__`.", expression));

                if (!controllers.hasOwnProperty(constructor)) {
                    throw new Error(util.format(
                        "Argument '%s' is not a function, got %s", 
                        constructor,
                        (constructor && typeof(constructor) === 'object' ? constructor.constructor.name || 'Object' : typeof(constructor))
                    ));
                }
                
                expression = controllers[constructor];
            }
            
            return $injector.instantiate(expression, locals, constructor);
        };
    }];
}