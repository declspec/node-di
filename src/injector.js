"use strict";

var minErr          = require("./minErr"),
    HashMap         = require("./HashMap"),
    diModule        = require("./di-module"),
    injectorMinErr  = minErr("$injector");

var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m,
    FN_ARG_SPLIT = /,/,
    FN_ARG = /^\s*(_?)(\S+?)\1\s*$/,
    STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;    

// Exporting
module.exports = createInjector;
module.exports.$$annotate = annotate;
    
function assertArgFn(arg, name, acceptArrayAnnotation) {
    if (acceptArrayAnnotation && Array.isArray(arg)) 
        arg = arg[arg.length - 1];
  
    if ("function" !== typeof(arg)) {
        throw injectorMinErr("areq", "Argument '{0}' is not a function, got {1}", 
            (name || "?"), 
            (arg && typeof arg === 'object' ? arg.constructor.name || 'Object' : typeof arg)
        );
    }
}

function anonFn(fn) {
    // For anonymous functions, showing at the very least the function signature can help in
    // debugging.
    var fnText = fn.toString().replace(STRIP_COMMENTS, ''),
        args = fnText.match(FN_ARGS);
      
    return args
        ? "function(" + (args[1] || "").replace(/[\s\r\n]+/, ' ') + ")"
        : "fn";
}
    
function annotate(fn, strict, name) {
    var $inject;

    if ("function" === typeof(fn)) {
        if (!($inject = fn.$inject)) {
            if (!fn.length)
                $inject = [];
            else if (strict) {
                // Must have explicit annotation in strict mode
                if ("string" !== typeof(name))
                    name = fn.name || anonFn(fn);
                throw injectorMinError("strictdi", "{0} is not using explicit annotation and cannot be invoked in strict mode", name);
            }
            else {
                var args = fn.toString().replace(STRIP_COMMENTS, "").match(FN_ARGS)
                // Guaranteed ECMAScript5 joys
                $inject = args[1].split(FN_ARG_SPLIT).map(function(arg) {
                    return arg.match(FN_ARG)[2];
                });
            }
            
            fn.$inject = $inject;
        } 
    }
    else if (Array.isArray(fn)) {
        var last = fn.length - 1;
        assertArgFn(fn[last], "fn");
        $inject = fn.slice(0, last);
    }
    else {
        // Not a function or an array, this assert will 100% fail and throw an exception
        assertArgFn(fn, "fn");
    }
    
    return $inject;
}

function createInjector(modulesToLoad, strictDi) {
    strictDi = !!strictDi;
    
    var INSTANTIATING = {}, // ref
        providerSuffix = 'Provider',
        path = [],
        loadedModules = new HashMap([]),
        instanceCache = {};
    
    
    var providerCache = {
        // the base $provide provider is always available
        "$provide": {
            provider: provider,
            factory: factory,
            service: service,
            value: value,
            constant: constant
        }
    };
    
    var providerInjector = providerCache.$injector = createInternalInjector(providerCache, function(name, caller) {
        // Used to backtrack the provider trace
        if ("string" === typeof(caller))
            path.push(caller);
        throw injectorMinErr("unpr", "Unknown provider: {0}", path.join("\n\t"));
    });
        
    var instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, function(name, caller) {
        // Attempt to retrieve a provider (will throw the providerInjector's exception if the provider can't be found)
        var provider = providerInjector.get(name + providerSuffix, caller);
        return instanceInjector.invoke(provider.$get, provider, undefined, name);
    });
    
    loadModules(modulesToLoad).forEach(function(fn) { fn && instanceInjector.invoke(fn); });
    
    return instanceInjector;
    
    //
    // $provide implementation
    //
    function enforceReturnValue(name, factory) {
        return function() {
            var result = instanceInjector.invoke(factory, this);
            if ("undefined" === typeof(result))
                throw injectErrMin("undef", "Provider '{0}' must return a value from $get factory method", name);
            return result;
            
        }
    }
    
    function provider(name, provider_) {
        if ("function" === typeof(provider_) || Array.isArray(provider_))
            provider_ = providerInjector.instantiate(provider_);
        
        if (!provider_.$get) 
            throw injectorMinErr("pget", "Provider '{0}' must define $get factory method", name);
        
        return providerCache[name + providerSuffix] = provider_;
    }
    
    function factory(name, factoryFn, enforce) {
        return provider(name, {
            $get: enforce !== false ? enforceReturnValue(name, factoryFn) : factoryFn
        });
    }
    
    function service(name, constructor) {
        return factory(name, [ "$injector", function($injector) {
            return $injector.instantiate(constructor);
        }]);
    }
    
    function value(name, val) {
        return factory(name, function() { return val; });
    }
    
    function constant(name, value) {
        providerCache[name] = instanceCache[name] = value;
    }
    
    //
    // Module loading
    //
    function runQueue(queue) {
        for(var i = 0, j = queue.length; i < j; ++i) {
            var args = queue[i],
                provider = providerInjector.get(args[0]);
            provider[args[1]].apply(provider, args[2]);
        }
    }
    
    function loadModules(modulesToLoad) {
        var blocks = [];
        
        modulesToLoad.forEach(function(module) {
            if (loadedModules.get(module))
                return;
                
            loadedModules.put(module);
            
            try {
                if ("string" === typeof(module)) {
                    var fn = diModule(module); 
                    blocks = blocks.concat(loadModules(fn.requires)).concat(fn._runBlocks);
                    runQueue(fn._invokeQueue);
                    runQueue(fn._configBlocks);
                }
                else if ("function" === typeof(module) || Array.isArray(module)) {
                    blocks.push(providerInjector.invoke(module));
                }
                else {
                    assertArgFn(module, "module");
                }
            }
            catch(e) {
                if (Array.isArray(module))
                    module = module[module.length - 1];
                throw injectorMinErr("moderr", "Failed to instantiate module {0} due to:\n{1}", module, e.stack || e.message);
            }
        });
        
        return blocks;
    }
    
    //
    // Internal injector
    //
    function createInternalInjector(cache, factory) {
        return {
            invoke: invoke,
            instantiate: instantiate,
            get: getService,
            annotate: annotate,
            has: function(name) {
                return providerCache.hasOwnProperty(name + providerSuffix) || cache.hasOwnProperty(name);
            }
        };  
    
        function getService(serviceName, caller) {
            if (cache.hasOwnProperty(serviceName)) {
                if (cache[serviceName] === INSTANTIATING)
                    throw injectorMinErr("cdep", "Circular dependency found: {0}", serviceName + ' <- ' + path.join(' <- '));
                return cache[serviceName];
            }
            else {
                try {
                    path.unshift(serviceName);
                    cache[serviceName] = INSTANTIATING;
                    return cache[serviceName] = factory(serviceName, caller);
                }
                catch(err) {
                    if (cache[serviceName] === INSTANTIATING)
                        delete cache[serviceName];
                    throw err;
                }
                finally {
                    path.shift();
                }
            }
        }
        
        function invoke(fn, self, locals, serviceName) {
            if ("string" === typeof(locals)) {
                serviceName = locals;
                locals = null;
            }
            
            var args = [],
                key,
                $inject = annotate(fn, strictDi, serviceName);
                
            for(var i=0,j=$inject.length; i<j; ++i) {
                key = $inject[i];
                if ("string" !== typeof(key))
                    throw injectorMinErr("itkn", "Incorrect injection token! Expected service name as string, got {0}", key);
                    
                args.push(locals && locals.hasOwnProperty(key) ? locals[key] : getService(key, serviceName));
            }
            
            if (Array.isArray(fn))
                fn = fn[$inject.length];
            
            return fn.apply(self, args);
        }
        
        function instantiate(type, locals, serviceName) {
            // Check if Type is annotated and use just the given function at n-1 as parameter
            // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
            // Object creation: http://jsperf.com/create-constructor/2
            var instance = Object.create((isArray(type) ? type[type.length - 1] : type).prototype || null),
                returned = invoke(type, instance, locals, serviceName);
                
            return returned !== null && "object" === typeof(returned);
        }
    }
}