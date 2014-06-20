/** @constructor
    @template U,V */
var x0 = function() {};

/** @constructor
    @template W
    @extends {x0.<string, W>} */
var x1 = function() {};

/** @type {!x1.<number>} */
var x2 = new x1();

var x3 =
/**
 * @param {string} x
 * @param {!V} y
 * @param {!Array.<!U>=} z
 * @return {!U}
 * @template U,V
 */
function(x, y, z) {};

var x4 = x3('a', 'b')
