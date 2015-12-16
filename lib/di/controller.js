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
            var constructor;
            
            if ("string" === typeof(expression)) {
                constructor = expression;
                expression = getControllerByName(expression, true);
            }

            return $injector.instantiate(expression, locals, constructor);
        };
    }];
    
    function getControllerByName(name, throwOnError) {
        var match = name.match(CNTRL_REG),
            constructor = match && match[1];
        
        if (match === null) {
            if (throwOnError)
                throw new Error(util.format("Badly formed controller string '%s'. Must match `__name__`.", name));
            return null;
        }
        
        if (!controllers.hasOwnProperty(constructor)) {
            if (throwOnError) {
                throw new TypeError(util.format(
                    "Argument '%s' is not a function, got %s", 
                    constructor, 
                    (constructor && typeof(constructor) === 'object' ? constructor.constructor.name || 'Object' : typeof(constructor))
                ));
            }
            return null;
        }
        
        return controllers[constructor];
    }
}