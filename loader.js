"use strict";

var modules = {};

module.exports = function module(name, request, configFn) {
    if (requires && modules.hasOwnProperty(name))
        modules[name] = null;
    else if (modules[name])
        return modules[name];
        
    var invokeQueue = [],
        configBlocks = [],
        runBlocks = [];
        
    var config = invokeLater("$injector", "invoke", "push", configBlocks);
    
    var moduleInstance = {
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

    function invokeLater(provider, method, insertMethod, queue) {
        if (!queue) queue = invokeQueue;
        return function () {
            queue[insertMethod || 'push']([provider, method, arguments]);
            return moduleInstance;
        };
    }

    function invokeLaterAndSetModuleName(provider, method) {
        return function (recipeName, factoryFunction) {
            if (factoryFunction && isFunction(factoryFunction)) factoryFunction.$$moduleName = name;
            invokeQueue.push([provider, method, arguments]);
            return moduleInstance;
        };
    } 
}
