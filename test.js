var di = require("./index");

var module1 = di.module("module1", []);
var module2 = di.module("module2", []);
var module3 = di.module("module3", [ "module1", "module2" ]);

// Test out namespacing
module1.factory("LogService", function() {
    return {
        log: console.log
    };
});

module1.factory("ExampleService", [ "LogService", function(LogService) {
    return {
        test: function(expr) {
            return LogService.log(expr);
        }
    };
}]);

module2.factory("LogService", function() {
    return {
        log: function(expr) {
            return console.log("module2: ", expr);
        }
    };
});

module3.run(["ExampleService", "module2:LogService", function(ExampleService, LogService) {
    console.log("Expecting no 'module2' prefix:");
    ExampleService.test("Hello, world");
    console.log("Expecting 'module2' prefix:");
    LogService.log("Hello, world");
}]);

var injector = di.injector([ "module3" ], true);