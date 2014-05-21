// Closure doesn't consider function type nullable so this fails.
/** @type {function()} */
var x0 = function() {};
//x0 = null;

// Closure doesn't consider record type nullable so this fails.
/** @type {{a: number}} */
var x1 = {a: 100};
//x1 = null;

/** @type {Object} */
var x2 = {};
x2 = null;

// Redundant type.
/** @type {undefined|boolean|string|number|*} */
var x3 = 0;
x3 = null;

// Union for function param and return. Need parens.
/** @type {function(!Object,(number|boolean)):(string|null)} */
var x4 = function(a, b) { return null; }
x4({}, 0);
/** @type {function((number|boolean),(string|null)):(number|string)} */
var x5 = function(a, b) { return ''; }
x5(false, '');

/** @type {{abc:number,ghi:boolean}|{abc:string,def:!Object}} */
var x6 = {abc:'', def:{}};

// Empty records get rejected.
//** @type {{}} */
//var x7 = {};

// null is recognized as a type. Setting it to undefined is not allowed, but
// leaving it uninitialized is ok.
/** @type {null} */
var x8 = null;
/** @type {null} */
var x9;
/** @type {null} */
//var x10 = undefined;

// undefined is recognized as a type too.
/** @type {undefined} */
var x11 = undefined;

/** @type {function(null,null):null|
  !Array.<null>|!Object.<null,null>|{abc:null,def:null}} */
var x12 = {};

// !Object|null is equivalent of Object.
/** @type {!Element|number|!Array|null} */
var x13 = 0;

/** @type {function(!number,boolean=)|function(number=)} */
var x14 = function(a, opt_b) {};

/** @type {function(string,...[!Object])|function(...[boolean])} */
var x15 = function(a, b) {};
