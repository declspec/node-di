"use strict";

var _ = require("lodash"),
    URL = require("url"),
    http = require("http"),
    https = require("https");

module.exports = function(mod) {
    mod.provider("$http", makeProvider(http));
    mod.provider("$https", makeProvider(https));
};

function makeProvider(client) {
    return function() {
        // TODO: Implement http configuration here

        this.$get = [ "$q", function($q) {
            service.get = function(uri, config) {
                var url = URL.parse(uri);
            
                return service(_.extend({}, config||{}, {
                    host: url.host,
                    method: "GET",
                    port: 80,
                    path: url.path
                }));
            };
        
            return service;
        
            function service(config) {
                console.log(config);
            
                var deferred = $q.defer();
                
                client.request(config, function(res) {
                    console.log("got request");
                
                    var data = "";
                    res.on("data", function(d) {
                        data += d;
                    });
                    
                    res.on("end", function() {
                        console.log(data);
                        deferred.resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: data,
                            statusText: res.statusMessage
                        });
                    });
                })
                .on("error", deferred.reject)
                .end();
                
                return deferred.promise;
            };
        }];
    }
}
