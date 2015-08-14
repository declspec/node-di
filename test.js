var di = require("./index");

di.injector(["di"]).invoke([ "$controller", "$http", function($controller, $http) {
    $http.get("http://serverfault.com/questions/674974/how-to-mount-a-virtualbox-shared-folder").then(function(obj) {
        console.log(obj);
    });
}]);