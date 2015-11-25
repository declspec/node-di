"use strict";

module.exports = $FilterProvider;

$FilterProvider.$inject = [ "$provide" ];
function $FilterProvider($provide) {
    var filterSuffix = "Filter";
    
    this.register = function(name, factory) {
        if ("object" !== typeof(name))
            return $provide.factory(name + filterSuffix, factory);
        
        var filters = {};
        for(var key in name) 
            filters[key] = $provide.factory(key + filterSuffix, factory);
        
        return filters;
    };
    
    this.$get = ["$injector", function($injector) {
        return function(name) {
            return $injector.get(name + filterSuffix);
        };
    }];
}