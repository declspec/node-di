var di = require("./index"),
    $RouteProvider = require("./route");

var app = di.module("app", []);

app.provider("$route", $RouteProvider);

di.injector([ "app" ]).invoke(["$route", function($route) {
    console.log("here");
}]);