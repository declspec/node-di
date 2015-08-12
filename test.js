var di = require("./src/index");

var app = di.module("app", []);

app.constant("DepType", {
	UNKNOWN: 0,
	CIRCULAR: 1,
	SIMPLE: 2
});

app.factory("$httpq", [ "DepType", function(DepType) {
    return {
        log: function(x) {
            console.log("$httpq: " + DepType.SIMPLE);
        }
    };
}]);


di.bootstrap([ "app" ]).invoke(["$httpq", function($httpq) {
    $httpq.log("test");
}]);