# ir2js

__ir2js__ converts source code written in __ir__ syntax to JavaScript code with
[Google Closure](https://developers.google.com/closure) annotations.
__ir__ is a statically typed language with concise grammar and focus on class
design, but otherwise very similar to JavaScript.


## Features of the ir language

- Statically typed (type checking provided by the Closure compiler). Types are
requierd for function parameters and class members variables.
- Concise grammar -- much smaller than the equivalent JavaScript code with
Closure annotations. Smaller code lowers refactoring barrier.
- Explicit class system. Smaller overhead of defining a new class promotes
designing code based on classes and how they interact with each other.
- Indentations to express code blocks (as in Python) as well as data structures
(like YAML). This makes the code and data structures visually clearer.


## Features of the converter

- __ir2js__ converter itself is written in __ir__ and runs on Node. (although
there is no reason it can not run on a modern browser).
- The conversion is per file -- one __ir__ file gets converted to one __js__
independently from other __ir__ or __js__ files.
- The converter can read metadata to sort the output __js__ files in the order
that satisfies the inheritance dependencies.
- The Closure compiler is required for the static type checking, but otherwise
the generated __js__ files run without further compilations.
- The compiled __js__ files do not require the Closure library.
- The produced __js__ files are reasonably readable and variable names are
preserved, so one can debug on them and find the corresponding code in the
original __ir__ files easily.
- The output __js__ is tested on V8 (Node.js and Chrome browser).


## How to use

To comple, run __node.js__ (the command maybe different for your
installation) with __ir2js__ as the first parameter, followed by the input
__ir__ file names.

```
$ node ir2js --outdir=output_dir input_file1.ir input_file2.ir ...
```

The generated files can be loaded into HTML with <script> tags.

```
<script src="output_dir/output_file1.js"></script>
<script src="output_dir/output_file2.js"></script>
```

Closure compiler can be used to do the static type checking on the output
__js__ files.

```
java -jar closure/compiler.jar \
--compilation_level ADVANCED_OPTIMIZATIONS \
--summary_detail_level 3 \
--warning_level VERBOSE \
--js_output_file compiled/_ir2js_test.js \
--js closure-library/closure/goog/base.js \
--js output_file1.js \
--js output_file2.js
```

See the Makeifle of __ir2js__ for how this can be set up.
