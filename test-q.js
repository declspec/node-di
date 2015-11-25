var di = require("./index");

var module1 = di.module("module1", ["di"]);

module1.factory("test", [ "$q", function($q) {
    function createPromise(duration, reject) {
        var deferred = $q.defer();
        setTimeout(deferred[reject ? "reject" : "resolve"], duration);
        return deferred.promise;
    }
    
    return {
        testObject: function() {
            var resolved = $q.when(true);
            
            var promises = {
                one: createPromise(100),
                two: createPromise(2000),
                three: createPromise(150),
                four: true,
                five: resolved
            };
            
            return $q.all(promises);   
        },
        
        testArray: function() {
            var resolved = $q.when(true);
            
            var promises = [
                createPromise(100),
                createPromise(2000),
                createPromise(150),
                true,
                resolved
            ];
            
            return $q.all(promises);   
        }
    };        
}]);

module1.filter("something", function() {
    
});

var injector = di.injector(["module1"], true);
injector.invoke(["test", function(test) {
    test.testObject().then(function(res) {
       console.log("object:", res); 
    });
    
    test.testArray().then(function(res) {
       console.log("array:", res); 
    });
}]);