"use strict";

// Simplified/nodeified version of AngularJS's loader mechanism
// https://github.com/angular/angular.js/blob/master/src/loader.js

var mkerr       = require("./mkerr"),
    injectorErr = mkerr("$injector");

// Internal module cache
var modules = {};

module.exports = function diModule(name, requires, configFn) {
    if (requires && modules.hasOwnProperty(name))
        modules[name] = null;
    else if (modules[name])
        return modules[name];
        
    if (!requires) {
          throw injectorErr('nomod', "Module '{0}' is not available! You either misspelled " +
             "the module name or forgot to load it. If registering a module ensure that you " +
             "specify the dependencies as the second argument.", name);
    }
        
    var invokeQueue = [],
        configBlocks = [],
        runBlocks = [];
        
    var config = invokeLater("$injector", "invoke", "push", configBlocks);
    
    var moduleInstance = modules[name] = {
        // Private state
        _invokeQueue: invokeQueue,
        _configBlocks: configBlocks,
        _runBlocks: runBlocks,
        
        config:     config,
        requires:   requires,
        name:       name,
        
        value:      invokeLater("$provide", "value"),
        constant:   invokeLater("$provide", "constant", "unshift"),
        provider:   invokeLaterAndSetModuleName("$provide", "provider"),
        factory:    invokeLaterAndSetModuleName("$provide", "factory"),
        service:    invokeLaterAndSetModuleName("$provide", "service"),
        controller: invokeLaterAndSetModuleName("$controllerProvider", "register"),
        
        run: function(block) {
            runBlocks.push(block);
            return this;
        }
    };
    
    if (configFn) 
        config(configFn);
    
    return moduleInstance;

    function invokeLater(provider, method, insertMethod, queue) {
        if (!queue) queue = invokeQueue;
        return function () {
            queue[insertMethod || 'push']([provider, method, arguments]);
            return moduleInstance;
        };
    }

    function invokeLaterAndSetModuleName(provider, method) {
        return function (recipeName, factoryFunction) {
            if (factoryFunction && "function" === typeof(factoryFunction)) 
                factoryFunction.$$moduleName = name;
            invokeQueue.push([provider, method, arguments]);
            return moduleInstance;
        };
    } 
}
