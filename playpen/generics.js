/** @constructor
    @template U,V */
var x0 = function() {};

/** @constructor
    @template W
    @extends {x0.<string, W>} */
var x1 = function() {};

/** @type {!x1.<number>} */
var x2 = new x1();
