
// -- isaacs Isaac Schleuter TODO
// -- airportyh TODO
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- cadorn Christoph Dorn TODO
// -- veged Sergey Berezhnoy TODO
// -- wuher Janne Kuuskeri Copyright (C) 2010 MIT License

var IO = require("io").IO,
    UTIL = require("narwhal/util"),
    ENGINE = require("http-client-engine"),
    FS = require("file");

exports.open = function (url, mode, options) {
    // todo mode negotiation, particularly for binary vs text buffering
    return new ENGINE.IO(url);
};

exports.read = function (url) {
    var stream = exports.open(url);
    try {
        return stream.read();
    } finally {
        stream.close();
    }
};

// TODO resolve the source as a file URL
exports.copy = function (source, target, mode) {
    mode = mode || 'b';
    return FS.path(target).write(exports.read(source, mode), mode);
};

exports.HttpClient = HttpClient;

var newTransactionId = (function () {
    var id = 1;
    return function () {
        return id ++;
    };
})();

var transaction = (function () {
    var hidden = {};
    return function (id, del) {
        if (del && hidden.hasOwnProperty(id)) {
            delete hidden[id];
            return;
        }
        if (!hidden.hasOwnProperty(id)) hidden[id] = {};
        return hidden[id];
    };
})();

// {method, url, headers, body}
// return value is {status:status, headers:{..}, body:[..]}
function HttpClient (settings) {
    if (!(this instanceof HttpClient)) return new HttpClient(settings);
    if (!this.txId) this.create();
    if (settings) this.setOptions(settings);
};

HttpClient.prototype = {

    create : function HttpClient_create () {
        // clean up, set up defaults.
        transaction(this.txId, true);
        this.txId = newTransactionId();
        this.setOptions({
            "method" : "GET",
            "headers" : {},
            "body" : []
        });
        return this;
    },

    setOptions : function HttpClient_setOption (settings) {
        for (var key in settings)  if (settings.hasOwnProperty(key)) {
            this.setOption(key, settings[key]);
        }
        return this;
    },

    setOption : function HttpClient_setOption (key, val) {
        var guts = transaction(this.txId);
        switch (key) {
            case "headers":
                if (typeof val !== 'object') throw new Error(
                    "HttpClient: headers must be a simple object."
                );
                return this.setHeaders(val);
            case "body":
                if (typeof val.forEach !== 'function') throw new Error(
                    "HttpClient: body must be iterable."
                );
                if (val && val.length !== 0) {
                    this.setHeader("Content-Length", val.length);
                }
                // fallthrough
            default:
                guts[key] = val;
        }
        return this;
    },

    setHeaders : function HttpClient_setHeaders (headers) {
        for (var h in headers) if (headers.hasOwnProperty(h)) {
            this.setHeader(h, headers[h]);
        }
        return this;
    },

    setHeader : function HttpClient_setHeader (key, val) {
        var guts = transaction(this.txId);
        if (!guts.hasOwnProperty("headers")) guts.headers = {};
        UTIL.set(guts.headers, key, val);
        return this;
    },

    write : function HttpClient_write (data) {
        var guts = transaction(this.txId);
        var len = 0;
        if (guts.hasOwnProperty("headers")) {
            len = UTIL.get(guts.headers, "Content-Length", 0);
        }
        len += data.length;
        this.setHeader("Content-Length", len);
        guts.body.push(data);
        return this;
    },

    connect : function HttpClient_connect (decode) {
        var guts = transaction(this.txId);
        var resp = ENGINE.connect(guts);
        if (decode) HttpClient.decode(resp);
        transaction(this.txId, true);
        return resp;
    }

};

HttpClient.decode = function HttpClient_decode (resp, encoding) {
    encoding = encoding || UTIL.get(resp.headers, "Content-Encoding");
    if (!encoding) {
        var contentType = UTIL.get(resp.headers, "Content-Type");
        if (contentType) {
            encoding = /charset=([^;\s]+)/.exec(contentType);
            if (encoding) encoding = encoding[1];
        }
    }
    // fall back on UTF-8. It's almost always a good choice.
    if (!encoding) encoding = 'UTF-8';
    var raw = resp.body;
    resp._rawBody = raw;
    resp.body = {forEach : function (block) {
        raw.forEach(function (i) {
            block(i.decodeToString(encoding));
        });
    }};
    return resp;
};

HttpClient.undecode = function HttpClient_undecode (resp) {
    if ("_rawBody" in resp) resp.body = resp._rawBody;
    delete resp._rawBody;
    return resp;
};

HttpClient.print = function HttpClient_print (resp) {
    var out = [];
    out.push(resp.statusText);
    UTIL.forEach(resp.headers, function (h, v) {
        out.push(h+": "+v);
    });
    out.push("");
    out=[out.join("\n")];
    resp.body.forEach(function (p) { out.push(p) });
    print(out.join(""));
};

