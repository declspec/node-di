"use strict";

// This is essentially the ui-router project's '$resolve' service.
// I've just repurposed it for my own ends.
// Original: https://github.com/angular-ui/ui-router/blob/master/src/resolve.js

var _           = require("lodash"),
    util        = require("core-util-is"),  
    mkerr       = require("../mkerr"),
    resolveErr  = mkerr("$resolve");

$ResolveFactory.$inject = [ "$q", "$injector" ];

module.exports = $ResolveFactory;

function $ResolveFactory($q, $injector) {
    // Object references
    var VISIT_IN_PROGRESS = 1,
        VISIT_DONE = 2,
        NOTHING = {},
        NO_DEPENDENCIES = [],
        NO_LOCALS = NOTHING,
        NO_PARENT = _.assign($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });
        
    return {
        resolve: resolve,
        study: study
    };
        
    function resolve(invocables, locals, parent, self) {
        return study(invocables)(locals, parent, self);   
    }
        
    function study(invocables) {
        if (!util.isObject(invocables))
            throw resolveErr("arg", "'invocables' must be a valid object");
        
        var plan = [],
            cycle = [],
            visited = {},
            invocableKeys = Object.keys(invocables);
            
        _.forEach(invocables, visit);
        
        return function(locals, parent, self) {
            if (isResolve(locals) && "undefined" === typeof(self)) {
                // adjust arguments
                self = parent;
                parent = locals;
                locals = null;
            }  
            
            if (!locals)
                locals = NO_LOCALS;
            else if (!util.isObject(locals))
                throw resolveErr("err", "'locals' must be an object");
            
            if (!parent)
                parent = NO_PARENT;
            else if (!isResolve(parent))
                throw resolveErr("err", "'parent' must be a resolvable promise created by $resolve");
                
            // To complete the overall resolution, we have to wait for the parent
            // promise and for the promise for each invokable in our plan.
            var resolution = $q.defer(),
                result = resolution.promise,
                promises = result.$$promises = {},
                values = _.assign({}, locals),
                wait = 1 + plan.length/3,
                merged = false;
                
            if (!util.isUndefined(parent.$$failure)) {
                fail(parent.$$failure);
                return result;   
            } 
            
            if (parent.$$inheritedValues)
                _.merge(values, _.omit(parent.$$inheritedValues, invocableKeys));
            
            _.assign(promises, parent.$$promises);
            
            if (parent.$$values) {
                var omitted = _.omit(parent.$$values, invocableKeys);
                merged = _.merge(values, omitted);
                result.$$inheritedValues = omitted;
                done();
            }
            else {
                if (parent.$$inheritedValues)
                    result.$$inheritedValues = _.omit(parent.$$inheritedValues, invocableKeys);
                parent.then(done, fail);    
            }
            
            for(var i = 0, j = plan.length; i < j; i+=3) {
                if (locals.hasOwnProperty(plan[i])) done();
                else invoke(plan[i], plan[i+1], plan[i+2]);   
            }
            
            return result;
                
            function done() {
                if (--wait)
                    return;
            
                if (!merged)
                    _.merge(values, parent.$$values);
                    
                result.$$values = values;
                result.$$promises = result.$$promises || true;
                delete result.$$inheritedValues;
                resolution.resolve(values);
            }
            
            function fail(err) {
                result.$$failure = err;
                resolution.reject(err);   
            }
            
            function invoke(key, invocable, params) {
                // Create a deferred for this invocation. Failures will propagate to the resolution as well.
                var invocation = $q.defer();
                promises[key] = invocation.promise;
                
                var waiting = _.pick(promises, params.filter(function(dep) {
                    return !locals.hasOwnProperty(dep);  
                }));

                // Add $q.all which accepts named arguments into the core $q in node-di :(
                $q.all(waiting).then(function(res) {
                    if (!util.isUndefined(result.$$failure))
                        return;
                    
                    values[key] = $injector.invoke(invocable, self, values);
                    invocation.resolve(values[key]);
                    done();
                }).fail(onFailure);

                function onFailure(err) {
                    invocation.reject(err);
                    fail(err);   
                }
            }
        };
            
        function isResolve(value) {
            return util.isObject(value) && value.then && value.$$promises;
        }
            
        function visit(value, key) {
            if (visited[key] === VISIT_DONE)
                return;
            
            cycle.push(key);
            
            // Detect cyclic dependencies
            if (visited[key] === VISIT_IN_PROGRESS) {
                cycle.splice(0, cycle.indexOf(key));
                throw resolveErr("cycl", "A cyclic dependency was found: {0}", cycle.join(" -> "));
            }
            
            visited[key] = VISIT_IN_PROGRESS;
            
            if (util.isString(value))
                plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
            else {
                var params = $injector.annotate(value);
                params.forEach(function(p) {
                    if (p !== key && invocables.hasOwnProperty(p))
                        visit(invocables[p], p); 
                });   
                plan.push(key, value, params);
            }

            cycle.pop();
            visited[key] = VISIT_DONE;
        }
    }
}