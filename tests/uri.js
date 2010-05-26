var assert = require("test/assert");
var util = require("util");

var uri = require("uri");
var URI = uri.URI;

exports.testConstructor = function() {
    var uri = new URI("http://www.narwhaljs.org/blog/categories?id=news");

    assert.isEqual("http", uri.scheme);
    assert.isEqual("www.narwhaljs.org", uri.authority);
    assert.isEqual("/blog/categories", uri.path);
    assert.isEqual("id=news", uri.query);
    assert.isEqual("", uri.anchor);
};

exports.testToString = function() {
    var uri = new URI("http://www.narwhaljs.org/blog/categories?id=news");
    assert.isEqual("http://www.narwhaljs.org/blog/categories?id=news", uri.toString());
};

util.forEachApply([
    ["/foo/bar/baz", "/foo/bar/quux", "quux"],
    ["/foo/bar/baz", "/foo/bar/quux/asdf", "quux/asdf"],
    ["/foo/bar/baz", "/foo/bar/quux/baz", "quux/"],
    ["/foo/bar/baz", "/foo/quux/baz", "../quux/"]
], function (from, to, expected) {
    exports[
        'testRelative ' +
        'from: ' + util.repr(from) + ' ' +
        'to: ' + util.repr(to) + ' ' +
        'is: ' + util.repr(expected)
    ] = function () {
        var actual = uri.relative(from, to);
        assert.eq(expected, actual);
    };
});


[
    ""
    , "/"
    , "/jedi"
    , "/jedi/"
    , "http://www.narwhaljs.org"
    , "http://www.narwhaljs.org/"
    , "http://www.narwhaljs.org/jedi"
    , "http://www.narwhaljs.org/jedi/"
    , "http://www.narwhaljs.org/jedi?jedi=jade"
    , "http://www.narwhaljs.org/jedi/?sith=dooku"
].forEach(function (item) {
              exports["testFormatting: " + item] = function () {
                  assert.isEqual(item, uri.format(new URI(item)));
              };
          });

util.forEachApply(
    [
        ["", ""]
        , ["jedi/../sith", "sith"]
        , ["http://jedi.net/hii/../hoo", "http://jedi.net/hoo"]
        , ["http://jedi.net/hii/../hoo?one=1", "http://jedi.net/hoo?one=1"]
        , ["http://jedi.net/hii/../hoo/?one=1", "http://jedi.net/hoo/?one=1"]
    ],
    function (url, expected) {
        exports["testFormattingRelative: " + url] = function () {
            assert.isEqual(expected, uri.format(new URI(url)));
        };
    });

if (require.main == module.id)
    require("os").exit(require("test/runner").run(exports));

