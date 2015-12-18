"use strict";

// Rather than using AngularJS's 'q.js' (https://github.com/angular/angular.js/blob/master/src/ng/q.js)
// I decided to take a shortcut and implement a really simple wrapper around Kris Kowal's Q library
var Q = require("q"),
    _ = require("lodash");
    
module.exports = $QFactory;
    
function $QFactory() {
    // Overwrite the 'all' functionality to accept objects/arrays
    // it's essentially the same as kriskowal's implementation except
    // uses lodash's _.forEach to accept any iterable 'promises' argument.
    Q.all = function(promises) {
        return Q.when(promises, function(resolved) {
            var deferred = Q.defer(),
                pending = 0;
            
            _.forEach(resolved, function(promise, key) {
                var snapshot;
                
                if (Q.isPromise(promise) && (snapshot = promise.inspect()).state === "fulfilled")
                    resolved[key] = snapshot.value;
                else {
                    ++pending;
                    Q.when(promise, function(v) {
                        resolved[key] = v;
                        if (--pending === 0)
                            deferred.resolve(resolved);
                    }, deferred.reject, function(progress) {
                        deferred.notify({ key: key, value: progress }); 
                    }); 
                } 
            });
            
            if (pending === 0)
                deferred.resolve(resolved);
            return deferred.promise;
        });
    };
    
    return Q;
}