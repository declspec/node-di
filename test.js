var di = require("./index");

var app = di.module("app", []);

app.factory("$httpq", function() {
    return {
        log: function(x) {
            console.log("$httpq: " + x);
        }
    };
});


di.bootstrap([ "app" ]).invoke(["$httpq", function($httpq) {
    console.log("here");
    $httpq.log("test");
}]);