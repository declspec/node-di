"use strict";

var _       = require("lodash"),
    util    = require("util");

var CNTRL_REG = /^(\S+)$/;

module.exports = $ControllerProvider;

function $ControllerProvider() {
    var controllers = {};
    
    this.register = function(name, constructor) {
        if ("object" === typeof(name)) 
            _.extend(controllers, name);
        else
            controllers[name] = constructor;
    };
    
    this.$get = ["$injector", function($injector) {
        // Convenience method to test if a controller exists
        // i.e $controller.exists("HomeController") -> true/false
        instantiate.exists = function(name) {
            return "string" === typeof(name) && getControllerByName(name, false) !== null;
        };
        
        return instantiate;
        
        function instantiate(expression, locals) {
            if ("string" === typeof(expression)) {
                expression = getControllerByName(expression, true);
                
                // Controller doesn't exist
                if (expression === null) {
                    throw new TypeError(util.format(
                        "Argument '%s' is not a function, got %s", 
                        constructor,
                        (constructor && typeof(constructor) === 'object' ? constructor.constructor.name || 'Object' : typeof(constructor))
                    ));
                }
            }
            
            return $injector.instantiate(expression, locals, constructor);
        };
    }];
    
    function getControllerByName(name, throwOnError) {
        var match = name.match(CNTRL_REG),
            constructor = match && match[1];
        
        if (match === null && throwOnError)
            throw new Error(util.format("Badly formed controller string '%s'. Must match `__name__`.", expression));
        
        return (match !== null && controllers.hasOwnProperty(constructor))
            ? controllers[constructor]
            : null;
    }
}