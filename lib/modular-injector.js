"use strict";

var _           = require("lodash"),
    mkerr       = require("./mkerr"),
    HashMap     = require("./HashMap"),
    diModule    = require("./di-module"),
    injectorErr = mkerr("$injector");

var FN_ARGS         = /^[^\(]*\(\s*([^\)]*)\)/m,
    FN_ARG_SPLIT    = /,/,
    FN_ARG          = /^\s*(_?)(\S+?)\1\s*$/,
    STRIP_COMMENTS  = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
    PROVIDER_SUFFIX = "Provider",
    INSTANTIATING   = {}; // object ref for determining circular dependencies.

// Exporting
module.exports = createInjector;
module.exports.$$annotate = annotate;
    
function assertArgFn(arg, name, acceptArrayAnnotation) {
    if (acceptArrayAnnotation && Array.isArray(arg)) 
        arg = arg[arg.length - 1];
  
    if ("function" !== typeof(arg)) {
        throw injectorErr("areq", "Argument '{0}' is not a function, got {1}", 
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
                throw injectorErr("strictdi", "{0} is not using explicit annotation and cannot be invoked in strict mode", name);
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
    
    var namespacedInjectors = {},
        injector = loadModules(modulesToLoad);

    return injector.instance.$injector;
    
    function loadModules(modulesToLoad, moduleCache) {
        moduleCache = moduleCache || new HashMap([]);
        
        var blocks = [],
            injectors = [],
            injector = null;

        modulesToLoad.forEach(function(mod) {
            // Check if the module is already loaded.
            if (moduleCache.get(mod)) {
                if ("string" === typeof(mod))
                    injectors.push(namespacedInjectors[mod]);
                return;
            }
            
            moduleCache.put(mod, true);

            try {
                if ("string" === typeof(mod)) {
                    var fn = diModule(mod),
                        modInjector = loadModules(fn.requires, moduleCache);
                    
                    injectors.push(namespacedInjectors[mod] = modInjector);
                    injector = null; // force recreation of the injector next time its needed
                    blocks = blocks.concat(fn._runBlocks);
                    
                    runQueue(fn._invokeQueue, modInjector.provider.$injector);
                    runQueue(fn._configBlocks, modInjector.provider.$injector);
                }
                else if ("function" === typeof(mod) || Array.isArray(mod)) {
                    if (injector === null) {
                        // Whenever we create an intermediate injector 
                        // we need to push it onto the injector stack so that
                        // any instances that are created during its lifetime aren't lost.
                        injector = createModuleInjector(injectors);
                        injectors.push(injector);
                    }
                    
                    blocks.push(injector.provider.$injector.invoke(mod));
                }
                else {
                    assertArgFn(mod, "module");
                }
            }
            catch(e) {
                if (Array.isArray(mod))
                    mod = mod[mod.length - 1];
                throw injectorErr("moderr", "Failed to instantiate module {0} due to:\n{1}", mod, e.stack || e.message);
            }
        });
        
        if (injector === null)
            injector = createModuleInjector(injectors);
        
        blocks.forEach(function(block) {
            block && injector.instance.$injector.invoke(block);
        });
        
        return injector;
    }
    
    function runQueue(queue, inj) {
        for(var i = 0, j = queue.length; i < j; ++i) {
            var args = queue[i],
                provider = inj.get(args[0]);
            provider[args[1]].apply(provider, args[2]);
        }
    }
    
    function createModuleInjector(injectors) {
        // Create a shared stack between provider/instance injectors to track
        // the dependencies and allow better error reporting.
        var stack = [];
        
        var cache = {
            instance: {},
            provider: {}
        };
            
        if (injectors) {
            for(var i = 0, j = injectors.length; i < j; ++i) {
                _.assign(cache.instance, injectors[i].instance);
                _.assign(cache.provider, injectors[i].provider);
            }
        }
        
        // Overwrite $provide to create a specific one for this instance.
        cache.provider.$provide = {
            provider: provider,
            factory: factory,
            service: service,
            value: value,
            constant: constant
        };

        var providerInjector = cache.provider.$injector = createInternalInjector(cache.provider, stack, function(name, caller) {
            // Used to backtrack the provider trace
            if ("string" === typeof(caller))
                stack.push(caller);
            throw injectorErr("unpr", "Unknown provider: {0}", stack.join("\n\t"));   
        });

        var instanceInjector = cache.instance.$injector = createInternalInjector(cache.instance, stack, function(name, caller) {
            // Attempt to retrieve a provider (will throw the providerInjector's exception if the provider can't be found)
            var provider = providerInjector.get(name + PROVIDER_SUFFIX, caller);
            return instanceInjector.invoke(provider.$get, provider, undefined, name);
        });

        return cache;

        //
        // $provide implementation
        //
        function enforceReturnValue(name, factory) {
            return function() {
                var result = instanceInjector.invoke(factory, this);
                if ("undefined" === typeof(result))
                    throw injectorErr("undef", "Provider '{0}' must return a value from $get factory method", name);
                return result;
            }
        }

        function provider(name, provider_) {
            if ("function" === typeof(provider_) || Array.isArray(provider_))
                provider_ = providerInjector.instantiate(provider_);

            if (!provider_.$get) 
                throw injectorErr("pget", "Provider '{0}' must define $get factory method", name);

            return cache.provider[name + PROVIDER_SUFFIX] = provider_;
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
            cache.provider[name] = cache.instance[name] = value;
        }
    }

    function createInternalInjector(cache, stack, factory) {
        return {
            invoke: invoke,
            instantiate: instantiate,
            get: getService,
            annotate: annotate
        };

        function getService(serviceName, caller) {
            if (cache.hasOwnProperty(serviceName)) {
                if (cache[serviceName] === INSTANTIATING)
                    throw injectorErr("cdep", "Circular dependency found: {0}", serviceName + ' <- ' + stack.join(' <- '));
                return cache[serviceName];
            }
            
            // check for namespacing convention
            var colonIdx = serviceName.indexOf(":"),
                namespace = colonIdx > 0 ? serviceName.substring(0, colonIdx) : null;
            
            // Defer to the namespaced injector
            if (namespace !== null && namespacedInjectors.hasOwnProperty(namespace)) {
                // NOTE: This is a pretty dirty hack to figure out which injector to use
                var type = cache.hasOwnProperty("$provide") ? "provider" : "instance",
                    injector = namespacedInjectors[namespace][type].$injector;
                return injector.get(serviceName.substring(colonIdx + 1), caller);
            }
            
            try {
                stack.unshift(serviceName);
                cache[serviceName] = INSTANTIATING;
                return cache[serviceName] = factory(serviceName, caller);
            }
            catch(err) {
                if (cache[serviceName] === INSTANTIATING)
                    delete cache[serviceName];
                throw err;
            }
            finally {
                stack.shift();   
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
                    throw injectorErr("itkn", "Incorrect injection token! Expected service name as string, got {0}", key);

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
            var instance = Object.create((Array.isArray(type) ? type[type.length - 1] : type).prototype || null),
                returned = invoke(type, instance, locals, serviceName);

            return ((returned !== null && "object" === typeof(returned)) || "function" === typeof(returned))
                ? returned
                : instance;
        }
    }
}

