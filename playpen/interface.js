/** @interface */
var x0 = function() {};
x0.prototype.m0 = function() {};

// Can not extend a class.
/** @constructor */
var x1 = function() {};
///** @interface
//    @extends {x1} */
//var x2 = function() {};

// Able to extend an interface.
/** @interface
    @extends {x0} */
var x3 = function() {};

// Extend multiple interfaces.
/** @interface */
var x4 = function() {};
x4.prototype.m1 = function() {};
/** @interface
    @extends {x0}
    @extends {x4} */
var x5 = function() {};

// Interface can not implement interface.
///** @interface
//    @implements {x0} */
var x6 = function() {};

// Class missing expected method impl will not compile (even w/o instantiation).
///** @constructor
//    @implements {x0}
//var x7 = function() {};

// Class with multiple implements.
/** @constructor
    @implements {x0}
    @implements {x4} */
var x8 = function() {};
x8.prototype.m0 = function() {};
x8.prototype.m1 = function() {};
var x9 = new x8();

// Marking method abstract not possible?
var goog = {};
goog.abstractMethod = function() {};
/** @constructor
    @implements {x0} */
var x10 = function() {};
x10.prototype.m0 = goog.abstractMethod;
x10.prototype.m2 = goog.abstractMethod;
var x11 = new x10();

// Still no error. Need to study...
/** @constructor
    @extends {x10} */
var x12 = function() {};
var x13 = new x12();

// Abstract method (without interface). Still allowed to create instance...?
/** @constructor */
var x14 = function() {};
x14.prototype.m0 = goog.abstractMethod;
var x15 = new x14();
/** @constructor
    @extends {x14} */
var x16 = function() {};
var x17 = new x16();
