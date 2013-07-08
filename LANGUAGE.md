# ir language reference


## File structure

The input file name may have a __.ir__ extension (this is not a requirement).
Everything in the file except code sections are comments. Here is a sample
input:

```
This is a comment.

:
  console.log('This line is in a code section.')
  // This is a comment in the code section.

This is another comment
```
converts into:
```
/*
This is a comment.
*/

  console.log('This line is in a code section.');
  // This is a comment in the code section.

/*
This is another comment.
*/
```

As in this example, a code section starts with a line with a colon (with no
indentation), followed by an indented block. There are several types of code
sections. What is used here is simply `:` which marks a block of code. See
[Code section types] for the complete list.

Comments inside the code sections need to start with `//` (same as the line
comments in JavaScript). __ir__ does not support block comments `/* ... */`.

Also note, __ir__ is a line based language -- a line terminated by `\n` is one
statement and so the end of line semicolons are not necessary (`;` is
automatically provided in the output __js__). Writing long lines of code is
usually not necessary in __ir__, but it is always possible to split long lines
using `|`.

```
:
  x := "5"
  y := \number\(x)
  => Math.sqrt(y * y +
  |y * y)
```
```
  var x = "5";
  var y = /** @type {number} */(x);
  return Math.sqrt(y * y +
    y * y);
```

The last line of the code illustrates the use of `|`. A line starts with `|` is
a continuation of the previous line. Its indentation has to be the same as the
line it is continueing.

The above also shows two types of code transformations. `:=` introduces a new
variable (using `var`). As in JavaScript, variable scope is always a function
(or global, as in the example above).

`=>` is simply converted to `return`.


## Block structure

__ir__ uses indentations for the block structures, so curly braces for `if`
statement etc are not necessary. This is similar to Python but in __ir__ the
concept is extended to data structures as well.

```
:
  if (a == b)
    =>
```
```
  if (a == b) {
    return ;
  }
```

This is similar to how Python indentation works, but __ir__ does not require
the if line to end with `:`.
As in Python, using `\t` (tab) for indentations can be confusing, and so is
not recommended.
Here is another example:


```
:
  obj := {#}
    attrib0: 'value'
    attrib1: 123
```

```
  var obj = {
    attrib0: 'value',
    attrib1: 123
  };
```

In this case, each indented line is an object attribute. The separating commas
are automatically provided where necessary. Note how the indented block
replaces the `#` in the first line. The context (i.e. the surrounding string)
of `#` determines how the indented block is interpreted.

```
:
  arr := [#]
    'abc'
    'def'
    'ghi'
```
```
  var arr = [
    'abc',
    'def',
    'ghi'
  ];
```

Similarly, `#` surrounded by hard brackets introduces an array block.

```
:
  f(#)
    obj
    arr
```
```
  f(
    obj,
    arr
  );
```

This is a function call and the block fills the comma separated parameter
ilst.

```
:
  arr.forEach(##)
    console.log('---')
```
```
  arr.forEach(function(){
    console.log('---');
  });
```

Two concective `#`s introduces an anonymous function. Later we describe
anonymous functions which take parameters.
Simple `#` can be used for any parenthesized expression if the indented
block has only one line.

```
:
  a := 1.0 / # + #
    Math.sqrt(x * x + y * y)
    abc
```
```
  var a = 1.0 / (
    Math.sqrt(x * x + y * y)
  ) + (
    abc);
```

Here each indented line simply replaces one `#`.
Also note this form of `#` matches one `#` to one line in the block while all
other forms of `#` expressions match one `#` token to the entire block.

The indented blocks can nest, and one line can take multiple `#` block markers.

```
:
  f({#}, [#])
    attrib0: 'value'
    attrib1: ##
      console.log('???')
    --
    'abc'
    'def'
    'ghi'
```

```
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
```

When there is more than one `#` tokens in a line (as in the first line of the
above example), the following indented blocks need to be separated by a `--`.
Note its indentation needs to be same as the indented blocks. Also the example
above shows that the anonymous function (`##`) is nested inside of the object
block.

These `#` tokens usually makes it unnecessary to use `|` to break a line.
Using `#` to decompose the line is preferred over `|` because in this form the
first line shows the overall structure of the expression while the following
block fills the details of each sub-expressions.


## Types

In __ir__, all type annotations are enclosed in two back slashes. The allowed
type names are same as what are allowed in Closure annotations, except that
trailing `=` (denotes optional parameter) is not necessary and some shorthand
type names are allowed:

  b -- boolean
  s -- string
  n -- number
  f -- function
  A -- Array
  O -- Object

```
:
  a := \A.<n>\(some_function(##))
    i\n\$
    => i * i
```
```
  var a = /** @type {Array.<number>} */(some_function(
  /** @param {number} i */
  function(i){
    return i * i;
  }));
```

Type notations in __ir__ are used in two places:

1) Type cast
2) Function return and parameter types (and member variables, see the section
[Class]).

The first line shows type casing. `A.<n>` is a shorthand of `Array.<number>`,
meaning the value is casted to an array of numbers. The cast always has the
format: `/type_expression/(value_expression)`.

As in Clousre, type casting is just for the static type checking (no coercion).
So, this line: `a := \A.<n>\(some_function(##))` 
calls a function `some_function`, casts its return value to array of numbers,
and then assigns the value to the variable `a`.

Note the sample code above also passes an anonymous function to
`some_function` -- a function simply squares the input. The line
`i\n\$` declares the anonymous function parameter `i` of type `n`
(i.e. number). Parameter declarations have one of two forms:

`parameter_name\type_expression\$`
or
`parameter_name\type_expression\? default_value`

The second form introduces an optional parameter. Optional parameters can not
be placed before any non-optional parameters. When the parameter value is not
provided by the caller, the parameter gets initialized with the default value.
The default value is optional.

```
:::one_to_three = ##
  \A\
  fn\f(n):n\$
  => [1, 2, 3].map(##)
    \n\
    i\n\? 0
    => fn(i)
```
```
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
```

Here we are introducing the second type of code section -- a global function.
The return type of the global function is declared on the first line of the
block (before any parameters or execution lines). Here it returns an array.
The anonymous function in the above code returns a number.

This anonymous function also shows the usage of an optioanl parameter
(although in this case it is never utilized). `i` gets the value 0 if the
parameter is omitted by the caller.


## Class

The code below shows the smallest class one can write in __ir__.

```
::MyClass
```
```
/** @constructor */
var MyClass = function(){
var _self = this;
};
MyClass.prototype._classname = 'MyClass';
```

As shown, a class definition actually creates a constructor function. Since it
is effectively a global function, it can have the same set of parameter
declarations global functions can have (except that a constructor function can
not have a return type).
The class name in `::MyClass` line can be dropped (so the line is just `::`)
in which case the converter uses the file name (minus `.ir` extension) for
the class name.

Member variables can also be declared in the class block along with the
constructor parameters.

```
::MyClass
  parameter\s\$
  @member\n\$
```
```
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
```

The member declarations always start with a `@`. There are 3 forms of member
declarations, depending on how they are initialized.

`@member_name\type_expression\ init_value`
  
The member gets initialized with the `init_value`, which can be any expression
and it may include parameter or member variables declared before this line.
`init_value` is optional -- when it is not specified, the member is initialized
with `null` (and you get Closure compiler gives you type error if the member
variable type is not compatible with `null`).

`@member_name\type_expression\$`
  
This is a hybrid of constructor parameter and member declaration. It adds one
parameter (with the member_name name) and initializes the member variable with
this parameter. This is what is used in the above example.

`@member_name\type_expression\? default_value`

This also adds one parameter and one member, but the parameter is optional.
If the parameter is not provided, `default_value` is evaluated and used to
initialize the member. `default_value` is optional -- when it is not specified
and the parameter is not given, the member is initialzied with `null`.

These member declarations and their initialization methods makes constructors
to have nothing else to do which is often good for the object design.

Note in __ir__ member variables are always private, which means we need to
create accessors in order to make them available even to sub-classes. __ir__
has simple annotations which causes the accessors to be created. This makes it
possible to create a data storage class (like `struct` in C) without writing
any line of execution code.

```
::MyClass
  parameter\s\$
  @member&\n\$
```
```
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
```

The `&` after the member name tells __ir__ to create both getter and setter
for that member. Similarly `+` only creates a getter and `*` only creates a
setter. These are JavaScript native getter / setter, so one can treat them
like object properties.

```
a := new MyClass(0, 1)

// This should output 1 (since the member is initialized with the second
// constructor parameter above.
console.log(a.member)

// This updates the member variable value to 2.
a.member = 2
```

The point of allowing accessors to be created so easily is not to promote
creating lots of data classes, but to make it easy to grow classes from static
data container to one that have behaviors. In order to do that, __ir__ also
allows you to override the accessors.

```
::SquareSequence
  @current\n\$

:current+
  sq := @current * @current
  @current++
  => sq

:current*
  @current = Math.floor(Math.sqrt(value))

Reset to zero.
:reset
  @current = 0
```
```
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
```

`:current+` and `:current*` show how one can define getter and setter for a
member respectively. `:reset` is a regular method.

All the accessors and methods belong to the most recently declared class in
the file. It will be an error to define accessors or methods before a class
is defined in the file.

Note the getter does not have the return type specified and the setter does not
have the parameter name or type specified. The type is taken from the member of
the same name, and the parameter name of setter is always `value`.

A method can have the return type and parameter list, as in global functions.
A method that has `@` before its name is a private method, e.g.

```
:@square\n\
  value\n\$
  => value * value
```

This is a private method which takes one number parameter and returns a number
value.

Unlike JavaScript, __ir__ does not use the keyword `this` for the object self
reference. All constructors, accessors, and methods have `_self` variable which
gets initialized to the value of `this` when entering the function. This makes
it possible to make self reference from anonymous functions inside these
functions without passing around `this`.
`@` is a shorthand for `_self`.

The members and methods can be accessed using `@`. Note while `@member_name`
accesses the member variable from within the class (e.g. from a method),
but `@.member_name` (note the period after `@`) accesses the accessor
(which might be overridden).
For methods, private methods need to be accessed as `@method_name`, while
public methods need to be accessed as `@.method_name`.

Note for both members and methods, `@.` is used for publically accessible
ones, and `@` is used for the private ones.


## Code section types

Optional parts of the line formats are in square brackets.

`::[ClassName][<ParentClass]`

This defines a class named ClassName. The file name is used as a class name
if the name is not provided.

`:[<][@]method_name[\return_type\]`

This defines a method of the most recently defined class. `<` declares the
method overrides a parent class method of the same name. `@` makes the method
is private.

`:member_name+`

This defines a getter method for the named member variable. The return type
does not need to be specified except when a member name that does not
exist in which case the return type is mandatory.

`:member_name*`

This defines a setter method for the named member. The input parameter type
is automatically selected from the member variable type, and the parameter
name is 'value'. If it is used for a member name that does not exist, a
parameter with a type has to be specified.

`:::name = expression`
`::name = expression`
`:name = expression`

The first line defines a global variable. If the `expression` is `##`, this
defines a global function. Similarly the second line declares a package
variable, and the last one creates a class local variable.

Class, method, and global function should be followed by a code block which
may start with a list of parameters.

`:`

This introduces a code block. It is not a function (and so there should not be
any parameter lines), but otherwise it goes through all the __ir__ conversions.

`:##`

This marks a code block which gets enclosed in an anonymous function,
i.e. `function() {...})();`

`:~`

The following block of code is native JavaScript. It gets copied to output
with no __ir__ conversions.

`:!typedef_name`

The following lines are concatenated and used as a type expression for the
typedef Closure annotation.
