ir2js converts source code written in ir syntax to JavaScript code with Closure annotations.
ir is a statically typed language with concise grammar with focus on class design, but
otherwise very similar to JavaScript.


=== Features of the ir language ===

- Statically typed (type checking provided by the Closure compiler). Types are requierd for
function parameters and class members.
- Concise grammar -- much smaller than the equivalent JavaScript code with Closure annotations.
Smaller code lowers refactoring barrier.
- Explicit class system. Smaller overhead of defining a new class promotes designing code
based on classes and how they interact with each other.
- Indentations to express code blocks (as in Python) as well as data structures.
This makes the code and data structures visually clearer.


=== Features of the converter ===

- ir2js converter itself is written in ir and runs on Node.js (although there is no reason
it can not run on a modern browser).
- The conversion is per file -- one ir file gets converted to one js independently from
other ir or js files.
- The converter can read metadata to sort the output js files in the order that satisfies the
inheritance dependencies.
- The Closure compiler is required for the static type checking, but otherwise the generated
js files run without further compilations.
- The compiled js files require a small portion of the Closure library (goog.provide, goog.base,
and goog.inherits).
- The produced js files are reasonably readable and variable names are preserved, so one can
debug on them and find the corresponding code in the original ir easily.
- The output js is tested on V8 (Node.js and Chrome browser).


=== How to use ===

To comple, run node.js (the command maybe different for your node.js installation) with ir2js
as the first parameter, followed by pairs of input and output file names.

  $ node ir2js input_file1.ir output_file1.js input_file2.ir output_file2.js ...

The generated files can be loaded into HTML with <script> tags.

  <script src="closure-library/closure/goog/base.js"></script>
  <script src="output_file1.js"></script>
  <script src="output_file2.js"></script>

Note the compiled code expects Closure library's base.js to be loaded beforehand.

Closure compiler can do the static type checking on the output js files.

java -jar closure/compiler.jar \
--compilation_level ADVANCED_OPTIMIZATIONS \
--summary_detail_level 3 \
--warning_level VERBOSE \
--js_output_file compiled/_ir2js_test.js \
--js closure-library/closure/goog/base.js \
--js output_file1.js \
--js output_file2.js

Here also we need to provide Closure library's base.js file.


=== Language references ===

[File structure]
The input file name may have a .ir extension (this is not a requirement). Everything in the
file except code sections are comments. Here is a sample input (file.ir) and output (file.js).

---------------------------------------- file.ir
This is a comment.

:
  console.log('This line is in a code section.')
  // This is a comment in the code section.

This is another comment
----------------------------------------
---------------------------------------- file.js
/*
This is a comment.
*/

  console.log('This line is in a code section.');

/*
This is another comment.
*/
----------------------------------------

As in this example, a code section starts with a line with a colon (with no indentation),
followed by an indented block. There are several types of code sections. What is used
here is simply ":" which marks a block of code. See [Code section types] for the
complete list.

Comments inside the code sections need to start with "//" (same as JavaScript's line
comments). ir does not support block comments "/* ... */".

Also note, ir is a line based language -- a line terminated by "\n" is one statement and so
the end of line semicolons are not necessary (";" is automatically provided in the output
js). Writing long lines of code is usually not necessary in ir, but it is always possible to
split long lines using "|".

---------------------------------------- file.ir
:
  x := "5"
  y := \number\(x)
  => Math.sqrt(y * y +
  |y * y)
----------------------------------------
---------------------------------------- file.js
  var x = "5";
  var y = /** @type {number} */(x);
  return Math.sqrt(y * y +
    y * y);
----------------------------------------

The last line of the code illustrates the use of "|". A line starts with "|" is a
continuation of the previous line. Its indentation has to be the same as the line it is
continueing.

The above also shows two types of code transformations. ":=" introduces a new variable (using
"var").  As in JavaScript, variable scope is always a function (or global, as in the example
above). "=>" is simply converted to "return".


[Block structure]
ir uses indentations for the block structures, so curly braces for "if" statement etc
are not necessary. This is similar to Python but in ir the concept is extended to data
structures as well. As in Python, using "\t" (tab) for indentations can be confusing, and so
is not recommended.

---------------------------------------- file.ir
:
  if (a == b)
    =>
----------------------------------------
---------------------------------------- file.js
  if (a == b){
    return ;
  }
----------------------------------------

This is similar to how Python indentation works, but ir does not require the if
line to end with ":".

---------------------------------------- file.ir
:
  obj := {#}
    attrib0: 'value'
    attrib1: 123
----------------------------------------
---------------------------------------- file.js
  var obj = {
    attrib0: 'value',
    attrib1: 123
  };
----------------------------------------

In this case, each indented line is an object attribute. The separating commas are
automatically provided where necessary. Note how the indented block replaces the "#" in
the first line. The context (i.e. the surrounding strign) of "#" determines how the
indented block is interpreted.

---------------------------------------- file.ir
:
  arr := [#]
    'abc'
    'def'
    'ghi'
----------------------------------------
---------------------------------------- file.js
  var arr = [
    'abc',
    'def',
    'ghi'
  ];
----------------------------------------

Similarly, "#" surrounded by hard brackets introduces an array block.

---------------------------------------- file.ir
:
  f(#)
    obj
    arr
----------------------------------------
---------------------------------------- file.js
  f(
    obj,
    arr
  );
----------------------------------------

This is a function call and the block fills the comma separated parameter ilst.
Note "(#)" can be used for any parenthesized expressions if the indented block has
only one line.

---------------------------------------- file.ir
:
  a := 1.0 / (#)
    Math.sqrt(x * x + y * y)
----------------------------------------
---------------------------------------- file.js
  var a = 1.0 / (
    Math.sqrt(x * x + y * y)
  );
----------------------------------------

Here the indented line simply replaces the "#". This usually makes it unnecessary to use
"|" to break a line. Using "#" to decompose the line is preferred over "|" because in
this form the first line shows the overall structure of the expression while the
following block fills the details of each sub-expressions.

---------------------------------------- file.ir
:
  arr.forEach(##)
    console.log('---')
----------------------------------------
---------------------------------------- file.js
  arr.forEach(function(){
    console.log('---');
  });
----------------------------------------

Finally two concective "#"s introduces an anonymous function. Later we describe anonymous
functions which take parameters.

The indented blocks can nest, and one line can take multiple "#" block markers.

---------------------------------------- file.ir
:
  f({#}, [#])
    attrib0: 'value'
    attrib1: ##
      console.log('???')
    --
    'abc'
    'def'
    'ghi'
----------------------------------------
---------------------------------------- file.js
  f({
    attrib0: 'value',
    attrib1: function(){
      console.log('???');
    }
  }, [
    'abc',
    'def',
    'ghi'
  ]);
----------------------------------------

When there is more than one "#"s in a line (as in the first line of the above example),
the following indented blocks need to be separated by a "--". Note its indentation needs to
be same as the indented blocks. Also the example above shows anonymous function ("##") is
nested inside of the object block.


[Types]
In ir, all type annotations are enclosed in two back slashes. The allowed type names are
same as what are allowed in Closure annotations, except that trailing "=" (denotes
optional parameter) is not necessary and some shorthand type names are allowed:

  b -- boolean
  s -- string
  n -- number
  f -- function
  A -- Array
  O -- Object

---------------------------------------- file.ir
:
  a := \A.<n>\(one_to_three(##))
    i\n\$
    => i * i
----------------------------------------
---------------------------------------- file.js
  var a = /** @type {Array.<number>} */(one_to_three(
  /** @param {number} i */
  function(i){
    return i * i;
  }));
----------------------------------------

Type notations in ir are used in two places:

1) Type cast
2) Function return and parameter types (and member variables, see the section [Class]).

The first line shows type casing. "A.<n>" is a shorthand of "Array.<number>", meaning
the value is casted to an array of numbers. The cast always has the format

  /type_expression/(value_expression)

As in Clousre, type casting is just for the static type checking (no coercion). So, this line

  a := \A.<n>\(one_to_three(##))

calls a function "one_to_three", casts its return value to array of numbers, and then assigns
the value to the variable "a".

Note, it also passes an anonymous function to "one_to_three" -- a function simply squares
the input. This line

  i\n\$

declares the anonymous function's parameter "i" of type "n" (i.e. number). Parameter
declarations have one of two forms:

  parameter_name\type_expression\$

    or

  parameter_name\type_expression\? default_value

The second form introduces an optional parameter. Optional parameters can not be placed
before any non-optional parameters. When the parameter value is not provided by the caller,
the parameter gets initialized with the default value. The default value is optional.

---------------------------------------- file.ir
:= one_to_three ##\A\
  fn\f(n):n\$
  => [1, 2, 3].map(##)
    \n\
    i\n\? 0
    => fn(i)
----------------------------------------
---------------------------------------- file.js
goog.provide('one_to_three');

/**
 * @param {function(number):number} fn
 * @return {Array}
 */
one_to_three = function(fn){
  return [1, 2, 3].map(
  /**
   * @param {number=} opt_i */
   * @return {number}
   */
  function(opt_i){
    var i = opt_i === undefined ? (0) : opt_i;
    return fn(i);
  });
};
----------------------------------------

Here we are introducing the second type of code section -- a global function. Global
functions (and classes shown later) automatically gets declared with goog.provide.

The return type of the global function is declared on the line that starts the code section

  := one_to_three ##\A\

Here it returns an array. The return type declaration is different for anonymous functions
-- it should be on the first line of anonymous function block (before the parameters).
The anonymous function in the above code returns a number.

This anonymous function also shows the usage of an optioanl parameter (although in this case
it is never utilized). "i" gets the value 0 if the parameter is not provided by the caller.


[Class]
The code below shows the smallest class one can write in ir.

---------------------------------------- file.ir
::MyClass
----------------------------------------
---------------------------------------- file.js
goog.provide('MyClass');

/** @constructor */
var MyClass = function(){
var _self = this;
};
MyClass.prototype._classname = 'MyClass';
----------------------------------------

As shown, a class definition actually creates a constructor function. Since it is effectively
a global function, it can have the same set of parameter declarations global functions
can have (except that a constructor function can not have a return type).

Member variables can also be declared in the class block along with the constructor parameters.

---------------------------------------- file.ir
::MyClass
  parameter\s\$
  @member\n\$
----------------------------------------
---------------------------------------- file.js
goog.provide('MyClass');

/**
 * @param {string} parameter
 * @param {number} member
 * @constructor
 */
MyClass = function(parameter, member){
var _self = this;
  /**
   * @type {number}
   * @private
   */
  this._member = member;
};
MyClass.prototype._classname = 'MyClass';
----------------------------------------

The member declarations always start with a "@". There are 3 forms of member declarations,
depending on how they are initialized.

  @member_name\type_expression\ init_value
  
The member gets initialized with the init_value, which can be any expression which may include
parameter or member variables declared before this line. init_value is optional -- when it
is not specified, the member is initialized with null (and you get Closure compiler's type
error if the specified type is not compatible with null).

  @member_name\type_expression\$
  
This is a hybrid of constructor parameter and member. It adds one parameter (with the
member_name name) and initializes the member variable with this parameter.
This is what is used in the above example.

  @member_name\type_expression\? default_value

This also adds one member and a parameter, but the parameter is optional. If the parameter
is not provided, default_value is evaluated and used to initialize the member.
default_value is optional -- when it is not specified and the parameter is not given,
the member is initialzied with null.

These member declarations and their initialization methods makes constructors to have
nothing else to do which is often good for the object design.

Note in ir member variables are always private, which means we need to create accessors
in order to make them available even to sub-classes. ir has simple annotations which
causes the accessors to be created. This makes it possible to create a data storage class
(like C's struct) without writing any line of execution code.

---------------------------------------- file.ir
::MyClass
  parameter\s\$
  @member&\n\$
----------------------------------------
---------------------------------------- file.js
goog.provide('MyClass');

/**
 * @param {string} parameter
 * @param {number} member
 * @constructor
 */
MyClass = function(parameter, member){
var _self = this;
  /**
   * @type {number}
   * @private
   */
  this._member = member;
};
MyClass.prototype._classname = 'MyClass';
/** @type {number} */
MyClass.prototype.member;
MyClass.prototype.__defineGetter__('member', function() {
return this._member;
});
MyClass.prototype.__defineSetter__('member', function(value) {
this._member = value;
});
----------------------------------------

The "&" after the member name tells ir to create both getter and setter for that member.
Similarly "+" only creates a getter and "*" only creates a setter. These are JavaScript's
native getter / setter, so one can treat them like object properties.

  a := new MyClass(0, 1)

  // This should output 1 (since the member is initialized with the second constructor
  // parameter above.
  console.log(a.member)

  // This updates the member variable's value to 2.
  a.member = 2

The point of allowing accessors to be created so easily is not to promote creating lots of
data classes, but to make it easy to grow classes from static data container to one
that have behavior. In order to do that, ir also allows you to override the accessors.

---------------------------------------- file.ir
::SquareSequence
  @current\n\$

:+current
  sq := @current * @current
  @current++
  => sq

:*current
  @current = Math.floor(Math.sqrt(value))

Reset to zero.
:reset
  @current = 0
----------------------------------------
---------------------------------------- file.js
goog.provide('SquareSequence');

/**
 * @param {number} current
 * @constructor
 */
var SquareSequence = function(current){
var _self = this;
  /**
   * @type {number}
   * @private
   */
  this._current = current;
};
SquareSequence.prototype._classname = 'SquareSequence';

/** @type {number} */
SquareSequence.prototype.current;
SquareSequence.prototype.__defineGetter__('current', function() {
var _self = this;
  var sq = _self._current * _self._current;
  _self._current++;
  return sq;
});

SquareSequence.prototype.__defineSetter__('current', function(value) {
var _self = this;
  _self._current = Math.floor(Math.sqrt(value));
});

/*
Reset to zero.
*/
SquareSequence.prototype.reset = function(){
var _self = this;
  _self._current = 0;
};
----------------------------------------

":+current" and ":*current" shows how one defines getter and setter for a member respectively.
":reset" is a regular method. All the accessors and methods belong to the most recently
declared class in the file. It will be an error to define accessors or methods before a class
in a file.

Note the getter does not have the return type specified and the setter does not have the
parameter name or type specified. The type is taken from the member of the same name,
and setter's parameter name is always "value".

A method can have the return type and parameter list, as in global functions. A method
that has @ before its name is a private method, e.g.

  :@square\n\
    value\n\$
    => value * value

This is a private method which takes one number parameter and returns a number value.

Unlike JavaScript, ir does not use the keyword "this" for the object's self reference.
All constructors, accessors, and methods have "_self" variable which gets initialized
to the value of "this" when entering the function. This makes it possible to make self
reference from anonymous functions inside these functions without passing around "this".
"@" is a shorthand for "_self".

The members and methods can be accessed using "@". Note while "@member_name" accesses the
member variable from within the class (e.g. from a method), but "@.member_name" (note the
period after "@") accesses the accessor (which might be overridden).
For methods, private methods need to be accessed as "@method_name", but public methods
need to be accessed as "@.method_name".

Note for both members and methods, "@." is used for publically accessible ones, and
"@" is used for the private ones.


[Code section types]
Optional parts of the line formats are in square brackets.

::ClassName [<ParentClass]

This defines a class named ClassName. The parent class is optional.

:[<][@]method_name[\return_type\]

This defines a method of the most recently defined class. "<" declares the method overrides
a parent class's method of the same name. "@" means this method is private.

:+member_name

This defines a getter method for the named member variable. The return type does not need
to be specified. If it is used for a member name that does not exist, the return type
is mandatory.

:*member_name

This defines a setter method for the named member. The input parameter type is automatically
selected from the member variable's type, and the parameter name is 'value'.
If it is used for a member name that does not exist, a parameter with a type has to be
specified.

:=global_func_name ##[\return_type\]

This defines a global function.

Class, method, and global function should be followed by a code block which may start with
a list of parameters.

:

This introduces a code block. It is not a function (and so there is no parameter lines),
but otherwise it goes through all the ir conversions.

:{

This marks a code block which gets enclosed in an anonymous function,
i.e. "function() {...})();"

:'multiline_str_name

The lines of the following block are concatenated as a string.

:~

The following block of code is native JavaScript. It gets copied to output with no
ir conversions.

:!typedef_name

The following lines are concatenated and used as a type expression for the typedef.
