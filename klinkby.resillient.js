/* jslint browser:true, node: true*/
(function(host) {
    "use strict";
    
    /**
     * Clone an object.
     */
    function clone(obj) {
        if(null === obj || 'object' !== typeof(obj)) return obj;
        var temp = obj.constructor(); // changed
        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                temp[key] = clone(obj[key]);
            }
        }
        return temp;
    }

    /**
     * Proxy callback fn to preserve "this" scope. 
     */
    function bind(scope, fn) {
        return function () {
            fn.apply(scope, arguments);
        };
    }

    /**
     * Configures request resillience.
     */
    function Resillience(retries, pauseMilliSeconds, pauseExponentBase){
        var def = Resillience.defaults;
        this.retries = retries || def.retries;
        this.pauseMilliSeconds = pauseMilliSeconds || def.pauseMilliSeconds;
        this.pauseExponentBase = pauseExponentBase || def.pauseExponentBase;
    }

    /**
     * Default options.
     */    
    Resillience.defaults = new Resillience(3, 100, 7);

    /**
     * Create a deep clone of the instance.
     */
    Resillience.prototype.clone = function() {
        return new Resillience(
            this.retries, 
            this.pauseMilliSeconds, 
            this.pauseIncrementalFactor);
    };

    /**
     * Defines the request contents and resillience.
     */
    function RequestOptions(headers, resillience, user, password) {
        var def = RequestOptions.defaults || {};
        this.headers = headers || def.headers;
        this.resillience = resillience || def.resillience.clone();
        this.user = user || def.user;
        this.password = password || def.password;
    }

    /**
     * Default options.
     */    
    RequestOptions.defaults = new RequestOptions(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        },
        Resillience.defaults,
        null,
        null);

    /**
     * Create a deep clone of the instance.
     */
    RequestOptions.prototype.clone = function() {
        return new RequestOptions(
            clone(this.headers),
            this.resillience.clone(),
            this.user,
            this.password
        );
    };

    /**
     * Resillient HTTP request.
     */    
    function ResillientRequest(url, method, body, options) {
        var def = ResillientRequest.defaults || {};
        this.url = url || def.url;
        this.method = method || def.method;
        this.body = body || def.body;
        this.options = options || def.options.clone();
        this.retries = 0;
    }

    /**
     * Default options.
     */    
    ResillientRequest.defaults = new ResillientRequest(null, "GET", null, RequestOptions.defaults);

    /**
     * Send the request.
     */    
    ResillientRequest.prototype.send = function() {
        var xhr = this.xhr = new host.XMLHttpRequest(),
            o = this.options,
            hdrs = o.headers,
            key;
        xhr.open(this.method, this.url, true, o.user, o.password);
        for(key in hdrs) {
            if(hdrs.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, hdrs[key]);
            }
        }
        xhr.onreadystatechange = bind(this, this.readystatechange);
        xhr.send(o.body);
    };

    /**
     * Callback when XHR ready state changes.
     */    
    ResillientRequest.prototype.readystatechange = function() {
        var xhr = this.xhr,
            continuation;
        if (4 === xhr.readyState) { // complete
            if (0 === xhr.status) { // no response
                try {
                    if (this.noResponse()) return;
                }
                catch(e) {
                    this.error(xhr, e && e.message, e);
                }
            }
            if (0 !== xhr.status && xhr.status < 400) {
                this.success(xhr.response, xhr.statusText, xhr);
                return;
            }
            this.error(xhr, xhr.statusText);
        }
    };

    /**
     * No response was received. Retry in a bit or give up.
     */    
    ResillientRequest.prototype.noResponse = function() {
        var r = this.options.resillience,
            pauseMs,
            maxRetries = this.options.resillience.retries;
        if (this.retries < maxRetries) {
            pauseMs = r.pauseMilliSeconds * Math.pow(r.pauseExponentBase, this.retries);
            host.setTimeout(bind(this, this.send), pauseMs); 
            this.retries += 1;
            return true;
        }
        return false;
    };

    /**
     * The request was accepted by the server.
     */    
    ResillientRequest.prototype.success = function(data, textStatus, xhr) {
    };

    /**
     * The request was rejected by the server, or if xhr.status = 0 we were not able to reach the server.
     */    
    ResillientRequest.prototype.error = function(xhr, textStatus, errorThrown) {
    };    

    if (undefined !== host.define) {
        // define Klinkby.Resillient module for AMD loader
        host.define(function() { 
            return ResillientRequest; 
        });    
    } else {
        // add to global namespace
        host.ResillientRequest = ResillientRequest;
    }
}(this));
