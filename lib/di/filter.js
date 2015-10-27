"use strict";

module.exports = function(mod) {
    mod.provider("$filter", $FilterProvider);
};

$FilterProvider.$inject = [ "$provide" ];

function $FilterProvider() {
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