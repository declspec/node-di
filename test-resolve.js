var di = require("./index");

var injector = di.injector([ "di" ]);

var resolve = {
    available: [ "$q", function($q) {
        return false;  
    }],
    
    next: [ "available", function(a) {
        console.log("should be false: ", a);
        return !a;
    }]
}

injector.invoke(["$resolve", function($resolve) {
    $resolve.resolve(resolve).then(function(res) {
       console.log(res.available);
       console.log(res.next);
    });
}]);