// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will write out Closure's deps file, unless the
 * global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects to
 * include their own deps file(s) from different locations.
 *
 *
 * @provideGoog
 */


/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {}; // Identifies this file as the Closure base.


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
//goog.global = this;
goog.global = global;


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as JSCompiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he), see http://wiki/Main/IIISynonyms.
 */
goog.LOCALE = 'en';  // default to en


/**
 * @define {boolean} Whether this code is running on trusted sites.
 *
 * On untrusted sites, several native functions can be defined or overridden by
 * external libraries like Prototype, Datejs, and JQuery and setting this flag
 * to false forces closure to use its own implementations when possible.
 *
 * If your javascript can be loaded by a third party site and you are wary about
 * relying on non-standard implementations, specify
 * "--define goog.TRUSTED_SITE=false" to the JSCompiler.
 */
goog.TRUSTED_SITE = true;


/**
 * Creates object stubs for a namespace.  The presence of one or more
 * goog.provide() calls indicate that the file defines the given
 * objects/namespaces.  Build tools also scan for provide/require statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 * @see goog.require
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 */
goog.provide = function(name) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name);
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 *
 * In the case of unit tests, the message may optionally be an exact
 * namespace for the test (e.g. 'goog.stringTest'). The linter will then
 * ignore the extra provide (if not explicitly defined in the code).
 *
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || '';
    throw Error('Importing test-only code into non-debug environment' +
                opt_message ? ': ' + opt_message : '.');
  }
};


if (!COMPILED) {

  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return !goog.implicitNamespaces_[name] && !!goog.getObjectByName(name);
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var part; part = parts.shift(); ) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};




// NOTE(nnaze): The debug DOM loader was included in base.js as an orignal
// way to do "debug-mode" development.  The dependency system can sometimes
// be confusing, as can the debug DOM loader's asyncronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the
// script will not load until some point after the current script.  If a
// namespace is needed at runtime, it needs to be defined in a previous
// script, or loaded via require() with its registered dependencies.
// User-defined namespaces may need their own deps file.  See http://go/js_deps,
// http://go/genjsdeps, or, externally, DepsWriter.
// http://code.google.com/closure/library/docs/depswriter.html
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work is being done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.ENABLE_DEBUG_LOADER = true;


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @see goog.provide
 * @param {string} name Namespace to include (as was given in goog.provide())
 *     in the form "goog.package.part".
 */
goog.require = function(name) {

  // if the object already exists we do not need do do anything
  // TODO(arv): If we start to support require based on file name this has
  //            to change
  // TODO(arv): If we allow goog.foo.* this has to change
  // TODO(arv): If we implement dynamic load after page load we should probably
  //            not remove this code for the compiled output
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return;
    }

    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return;
      }
    }

    var errorMessage = 'goog.require could not find: ' + name;
    if (goog.global.console) {
      goog.global.console['error'](errorMessage);
    }


      throw Error(errorMessage);

  }
};


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to write out Closure's deps file. By default,
 * the deps are written.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {*=} opt_returnValue The single value that will be returned.
 * @param {...*} var_args Optional trailing arguments. These are ignored.
 * @return {?} The first argument. We can't know the type -- just pass it along
 *      without type.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(opt_returnValue, var_args) {
  return opt_returnValue;
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      // NOTE: JSCompiler can't optimize away Array#push.
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};


/**
 * All singleton classes that have been instantiated, for testing. Don't read
 * it directly, use the {@code goog.testing.singleton} module. The compiler
 * removes this variable if unused.
 * @type {!Array.<!Function>}
 * @private
 */
goog.instantiatedSingletons_ = [];


if (!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName('script');
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;

      // If the user tries to require a new symbol after document load,
      // something has gone terribly wrong. Doing a document.write would
      // wipe out the page.
      if (doc.readyState == 'complete') {
        // Certain test frameworks load base.js multiple times, which tries
        // to write deps.js each time. If that happens, just fail silently.
        // These frameworks wipe the page between each load of base.js, so this
        // is OK.
        var isDeps = /\bdeps.js$/.test(src);
        if (isDeps) {
          return false;
        } else {
          throw Error('Cannot write "' + src + '" after document load');
        }
      }

      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          // If the required name is defined, we assume that it was already
          // bootstrapped by other means.
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error('Undefined nameToPath for ' + requireName);
            }
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  goog.findBasePath_();

  // Allow projects to manage the deps files themselves.
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + 'deps.js');
  }
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals tyepof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.  Additionally, this function assumes that the global
 * undefined variable has not been redefined.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return val !== undefined;
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code goog.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' + ((Math.random() * 1e9) >>> 0);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * A native implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 * @suppress {deprecated} The compiler thinks that Function.prototype.bind
 *     is deprecated because some people have declared a pure-JS version.
 *     Only the pure-JS version is truly deprecated.
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @template T
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default
      // Chrome extension environment. This means that for Chrome extensions,
      // they get the implementation of Function.prototype.bind that
      // calls goog.bind instead of the native one. Even worse, we don't want
      // to introduce a circular dependency between goog.bind and
      // Function.prototype.bind, so we have to hack this to make sure it
      // works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Prepend the bound arguments to the current arguments.
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = (goog.TRUSTED_SITE && Date.now) || (function() {
  // Unary plus operator converts its operand to a number which in the case of
  // a date is done by calling getTime().
  return +new Date();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(user): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @type {Object|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a
 * hyphen and passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which
 * these mappings are used. In the BY_PART style, each part (i.e. in
 * between hyphens) of the passed in css name is rewritten according
 * to the map. In the BY_WHOLE style, the full css name is looked up in
 * the map directly. If a rewrite is not specified by the map, the
 * compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls
 * to goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed
 * only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == 'BY_WHOLE' ?
        getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  if (opt_modifier) {
    return className + '-' + rename(opt_modifier);
  } else {
    return rename(className);
  }
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --closure_pass flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {Object|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Gets a localized message.
 *
 * This function is a compiler primitive. If you give the compiler a localized
 * message bundle, it will replace the string at compile-time with a localized
 * version, and expand goog.getMsg call to a concatenated string.
 *
 * Messages must be initialized in the form:
 * <code>
 * var MSG_NAME = goog.getMsg('Hello {$placeholder}', {'placeholder': 'world'});
 * </code>
 *
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object=} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};


/**
 * Gets a localized message. If the message does not have a translation, gives a
 * fallback message.
 *
 * This is useful when introducing a new message that has not yet been
 * translated into all languages.
 *
 * This function is a compiler primtive. Must be used in the form:
 * <code>var x = goog.getMsgWithFallback(MSG_A, MSG_B);</code>
 * where MSG_A and MSG_B were initialized with goog.getMsg.
 *
 * @param {string} a The preferred message.
 * @param {string} b The fallback message.
 * @return {string} The best translated message.
 */
goog.getMsgWithFallback = function(a, b) {
  return a;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('public.path.Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  /** @override */
  childCtor.prototype.constructor = childCtor;
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }

  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the
 * aliases applied.  In uncompiled code the function is simply run since the
 * aliases as written are valid JavaScript.
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *    (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  fn.call(goog.global);
};


var _fs = require('fs');
var _path = require('path');
var _util = require('util');
goog.provide('create_argtypes');

/**
 * @param {string} basedir
 * @param {Array.<string>} files
 */
var create_argtypes = function(basedir, files){
  var output;
  output = [];
  files.forEach(
  /** @param {string} file */
  function(file){
    var tk;
    tk = JSON.parse(_fs.readFileSync(file.replace(/\.js/, '.tk'), 'utf-8'));
    tk['cls'].forEach(
    /** @param {*} cls */
    function(cls){
      output.push(cls.name + '._argtypes = [' + cls['args'].join(', ') + '];');
      cls.methods.forEach(
      /** @param {*} method */
      function(method){
        output.push(cls.name + '.prototype.' + method.name + '._argtypes = [' + method['args'].join(', ') + '];');
      });
    });
    tk['fns'].forEach(
    /** @param {*} fn */
    function(fn){
      output.push(fn.name + '._argtypes = [' + fn['args'].join(', ') + '];');
    });
  });
  _fs.writeFileSync(basedir + '/_argtypes.js', output.join('\n'), 'utf-8');
};
goog.provide('BlockMatcher');

/*
Match markers and blocks.
*/

/**
 * @param {!Context} context
 * @param {InputLine} input
 * @param {Array.<parser.BlockMarker|string>} code
 * @param {Array.<IndentBlock>} blocks
 * @constructor
 */
var BlockMatcher = function(context, input, code, blocks){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
  /**
   * @type {Array.<parser.BlockMarker|string>}
   * @private
   */
  this._code = code;
  /**
   * @type {Array.<IndentBlock>}
   * @private
   */
  this._blocks = blocks;
  /**
   * @type {Array.<number>}
   * @private
   */
  this._marker_indexes = ([]);
  /**
   * @type {Array.<ParamSet>}
   * @private
   */
  this._params = ([]);
  // whether this line is a statement that comes with a block, like 'if'.
  /**
   * @type {boolean}
   * @private
   */
  this._is_block_statement = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._starts_with_marker = (false);
};
BlockMatcher.prototype._classname = 'BlockMatcher';
/** @type {boolean} */
BlockMatcher.prototype.is_block_statement;
BlockMatcher.prototype.__defineGetter__('is_block_statement', function() {
return this._is_block_statement;
});

BlockMatcher.prototype.transform = function(){
var _self = this;
  if (_self._match_blocks()){
    _self._transform_blocks();
  }
};

/*
Returns true only if matching succeeds and leaving valid set of indexes in
@marker_indexes and @params.
*/
/**
 * @return {boolean}
 * @private
 */
BlockMatcher.prototype._match_blocks = function(){
var _self = this;
  var code;
  code = _self._code;
  var idx;
  idx = 1;
  if (_self._code[0] instanceof parser.BlockMarker){
    idx = 0;
    _self._starts_with_marker = true;
  }

  while (idx < code.length){
    var param;
    param = null;
    var elem;
    elem = _self._code[idx];
    if (elem instanceof parser.BlockMarker && elem.type == 'f'){
      var sub_context;
      sub_context = _self._context.clone();
      sub_context.is_file_scope = false;
      param = new ParamSet(sub_context, _self._blocks[_self._marker_indexes.length]);
    }

    _self._marker_indexes.push(idx);
    _self._params.push(param);

    idx += 2;
  }

  if (_self._marker_indexes.length < _self._blocks.length){
    // One extra block is allowed.
    _self._marker_indexes.push(-1);
    _self._is_block_statement = true;
  }

  if (_self._marker_indexes.length != _self._blocks.length){
    warn(_self._input, '# blocks does not match #markers.');
    return false;
  }
  return true;
};

/** @private */
BlockMatcher.prototype._transform_blocks = function(){
var _self = this;
  _self._blocks.forEach(
  /**
   * @param {IndentBlock} block
   * @param {number} i
   */
  function(block, i){
    // transform the blocks.
    if (_self._params[i]){
      _self._params[i].transform();
    }
    var mi;
    mi = _self._marker_indexes[i];
    block.transform(mi < 0 ? BlockType.BLOCK : {
      f: BlockType.BLOCK,
      o: BlockType.OBJ,
      a: BlockType.ARRAY,
      p: BlockType.PARAMS
    }[_self._code[mi].type]);
  });
};

/** @return {Array.<string>} */
BlockMatcher.prototype.first_line = function(){
var _self = this;
  // there should be at least one fragment.
  return _self._compose_line(_self._starts_with_marker ? '' : (
    /** @type {string} */(_self._code.length ? _self._code[0] : '')
  ), 0);
};

/** @param {function(IndentBlock, Array.<string>)} cb */
BlockMatcher.prototype.each_fragment = function(cb){
var _self = this;
  _self._blocks.forEach(
  /**
   * @param {IndentBlock} block
   * @param {number} i
   */
  function(block, i){
    var mi;
    mi = _self._marker_indexes[i];
    cb(block, _self._compose_line(
      block.end_str() + (mi < 0 || mi + 1 >= _self._code.length ? '' : _self._code[mi + 1]),
      i + 1
    ));
  });
};

/**
 * @param {string} prefix
 * @param {number} i
 * @private
 */
BlockMatcher.prototype._compose_line = function(prefix, i){
var _self = this;
  if (_self._blocks.length <= i){
    return [prefix];
  }

  var b;
  b = _self._blocks[i];
  var p;
  p = _self._params[i];
  var bstart;
  bstart = [b.start_str()];
  if (!p){
    return [prefix + bstart];
  }
  if (p.is_decl_empty()){
    return [prefix + 'function(' + p.output_params() + ')' + bstart];
  }

  // we don't try to merge the prefix into first line.
  return arr_flatten([
    prefix,
    doc_lines(p.output_decls()),
    'function(' + p.output_params() + ')' + bstart
  ]);
};
goog.provide('BlockOutput');

/** @constructor */
var BlockOutput = function(){
var _self = this;
  /**
   * @type {Array.<LineOutput>}
   * @private
   */
  this._lines = ([]);
  // the suffix, if assigned a value, will be inserted after the last nonblank line.
  /**
   * @type {string?}
   * @private
   */
  this._suffix = (null);
};
BlockOutput.prototype._classname = 'BlockOutput';
/** @type {string?} */
BlockOutput.prototype.suffix;
BlockOutput.prototype.__defineGetter__('suffix', function() {
return this._suffix;
});
BlockOutput.prototype.__defineSetter__('suffix', function(value) {
this._suffix = value;
});

/** @param {LineOutput} line */
BlockOutput.prototype.append_line = function(line){
var _self = this;
  _self._lines.push(line);
};

/** @type {boolean} */
BlockOutput.prototype.is_empty;
BlockOutput.prototype.__defineGetter__('is_empty', function() {
var _self = this;
  return !_self._lines.length && !_self._suffix;
});

/*
inserts the suffix line to the array passed as a parameter.
*/
/**
 * @param {Array.<string>} lines
 * @private
 */
BlockOutput.prototype._add_suffix = function(lines){
var _self = this;
  // find the last non-blank line.
  var last_nonblank;
  last_nonblank = -1;
  lines.forEach(
  /**
   * @param {string} line
   * @param {number} i
   */
  function(line, i){
    if (line){
      last_nonblank = i;
    }
  });
  if (last_nonblank < 0){
    lines.unshift(_self._suffix);
  }
  else{
    lines.splice(last_nonblank + 1, 0, _self._suffix);
  }
};

/** @type {Array.<string>} */
BlockOutput.prototype.output;
BlockOutput.prototype.__defineGetter__('output', function() {
var _self = this;
  var lines;
  lines = _self._lines.reduce(
  /**
   * @param {Array.<string>} prev
   * @param {LineOutput} line
   * @param {number} i
   */
  function(prev, line, i){
    return prev.concat(line.output);
  }, []);
  if (_self._suffix){
    _self._add_suffix(lines);
  }
  return lines;
});
goog.provide('CallableType');

/**
 * @param {string} name
 * @constructor
 */
var CallableType = function(name){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {string}
   * @private
   */
  this._parent = ('');
  /**
   * @type {Array.<CallableType>}
   * @private
   */
  this._methods = ([]);
  /**
   * @type {Array.<string|null>}
   * @private
   */
  this._args = ([]);
};
CallableType.prototype._classname = 'CallableType';

/*
TODO: use setter.
*/
/** @param {string} parent_name */
CallableType.prototype.set_parent = function(parent_name){
var _self = this;
  _self._parent = parent_name;
};

/** @param {string} name */
CallableType.prototype.add_method = function(name){
var _self = this;
  var m;
  m = new CallableType(name);
  _self._methods.push(m);
  return m;
};

/** @param {string|null} arg */
CallableType.prototype.add_arg = function(arg){
var _self = this;
  _self._args.push(arg);
};

/** @return {Object} */
CallableType.prototype.extract = function(){
var _self = this;
  var obj;
  obj = {name: _self._name, args: _self._args};
  if (_self._parent){
    obj['parent'] = _self._parent;
  }
  if (_self._methods){
    obj['methods'] = _self._methods.map(
    /** @param {CallableType} m */
    function(m){
      return m.extract();
    });
  }
  return obj;
};
goog.provide('Class');

/** @constructor */
var Class = function(){
var _self = this;
  /**
   * @type {Constructor}
   * @private
   */
  this._ctor = (null);
  /**
   * @type {!Object.<string, Member>}
   * @private
   */
  this._members = ({});
};
Class.prototype._classname = 'Class';
/** @type {Constructor} */
Class.prototype.ctor;
Class.prototype.__defineGetter__('ctor', function() {
return this._ctor;
});
Class.prototype.__defineSetter__('ctor', function(value) {
this._ctor = value;
});

/** @return {!Name} */
Class.prototype.name = function(){
var _self = this;
  return _self._ctor.context.name;
};

/** @param {string} name */
Class.prototype.member = function(name){
var _self = this;
  return _self._members[name];
};

/**
 * @param {string} name
 * @param {Member} member
 */
Class.prototype.set_member = function(name, member){
var _self = this;
  _self._members[name] = member;
};

/**
 * @param {string} method_name
 * @return {!Name}
 */
Class.prototype.method_name = function(method_name){
var _self = this;
  return _self.name().property(method_name);
};

/**
 * @param {string} name
 * @param {TypeDecoder} type
 * @param {string} access_type
 * @param {boolean=} opt_is_pseudo
 * @return {Member}
 */
Class.prototype.add_member = function(name, type, access_type, opt_is_pseudo){
var _self = this;
  var is_pseudo = opt_is_pseudo === undefined ? (false) : opt_is_pseudo;
  var m;
  m = new Member(name, type, access_type, is_pseudo);
  _self._members[name] = m;
  return m;
};

/** @return {Array} */
Class.prototype.output_accessors = function(){
var _self = this;
  var class_name;
  class_name = _self.name();
  return Object.keys(_self._members).map(
  /** @param {string} name */
  function(name){
    return _self._members[name].output_accessors(class_name);
  });
};
goog.provide('CodeParser');

/**
 * @param {!Context} context
 * @param {SectionHead} head
 * @constructor
 */
var CodeParser = function(context, head){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {SectionHead}
   * @private
   */
  this._head = head;
  /**
   * @type {Array.<IndentBlock>}
   * @private
   */
  this._blocks = ([]);
  /**
   * @type {CodeLine}
   * @private
   */
  this._last_valid_line = (null);
  /**
   * @type {Array.<SectionLine>}
   * @private
   */
  this._invalid_lines = ([]);
};
CodeParser.prototype._classname = 'CodeParser';

/** @param {Array.<InputLine>} input_lines */
CodeParser.prototype.parse = function(input_lines){
var _self = this;
  _self._process(input_lines);
  if (!input_lines.length){
    return;
  }
  assert(
    _self._blocks.length <= 1,
    input_lines[0],
    'block stack depth: ' + _self._blocks.length
  );
};

/**
 * @param {Array.<InputLine>} input_lines
 * @private
 */
CodeParser.prototype._process = function(input_lines){
var _self = this;
  _self._head.lines = input_lines;

  var first_line_indent;
  first_line_indent = 0;
  var code_lines;
  code_lines = _self._make_code_lines(input_lines);
  code_lines.some(
  /** @param {SectionLine} line */
  function(line){
    if (!(line instanceof InvalidLine)){
      first_line_indent = line.indent;
      return true;
    }
    return false;
  });
  _self._blocks = [new IndentBlock(0, first_line_indent, _self._head)];
  _self._head.add_block(_self._blocks[0]);

  code_lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i){
    // create blocks and assign lines to them.
    if (line instanceof InvalidLine){
      _self._invalid_lines.push(line);
      return;
    }

    var prev_indent;
    prev_indent = _self._top_block().indent;
    var indent;
    indent = line.indent;

    if (indent > prev_indent){
      _self._deeper_indent(i, indent);
    }
    else if (indent < prev_indent){
      _self._shallower_indent(line, i);
    }

    _self._add_invalid_lines();
    if (line.is_continuation){
      _self._continuation(line, i);
    }
    else if (line instanceof SeparatorLine){
      _self._separator(line, indent, i);
    }
    else{
      _self._last_valid_line = /** @type {CodeLine} */(line);
      _self._top_block().add(line);
    }
  });
  _self._add_invalid_lines();
  _self._pop_rest();
};

/**
 * @param {Array.<InputLine>} input_lines
 * @return {Array.<SectionLine>}
 * @private
 */
CodeParser.prototype._make_code_lines = function(input_lines){
var _self = this;
  var cat;
  cat = new LineCategorizer(_self._context);
  return input_lines.map(
  /** @param {InputLine} line */
  function(line){
    return cat.create_line(line);
  });
};

/**
 * @param {number} i
 * @param {number} indent
 * @private
 */
CodeParser.prototype._deeper_indent = function(i, indent){
var _self = this;
  // push a new block in the stack.
  var b;
  b = new IndentBlock(i, indent, _self._last_valid_line);
  _self._last_valid_line.add_block(b);
  _self._blocks.push(b);
};

/**
 * @param {SectionLine} line
 * @param {number} i
 * @private
 */
CodeParser.prototype._shallower_indent = function(line, i){
var _self = this;
  // back up levels.
  while (line.indent < _self._top_block().indent){
    _self._blocks.pop();
    assert(
      _self._blocks.length >= 1,
      line.input,
      'stack size zero (line ' + (i + 1) + '): ' + line.str
    );
  }
  if (line.indent > _self._top_block().indent){
    warn(line.input, 'indent level does not match');
  }
};

/**
 * @param {SectionLine} line
 * @param {number} indent
 * @param {number} i
 * @private
 */
CodeParser.prototype._separator = function(line, indent, i){
var _self = this;
  var prev_b;
  prev_b = _self._blocks.pop();
  var b;
  b = new IndentBlock(i, indent, prev_b.head());
  prev_b.head().add_block(b);
  _self._blocks.push(b);
};

/**
 * @param {SectionLine} line
 * @param {number} i
 * @private
 */
CodeParser.prototype._continuation = function(line, i){
var _self = this;
  var last_line;
  last_line = _self._top_block().last_line();
  if (!last_line){
    warn(line.input, 'continuation as a first line of block');
  }
  else{
    last_line.continue_lines.push(new InputLine(
      line.input.line.replace(/\|/, ' '),
      line.input.row_index
    ));
  }
  _self._last_valid_line = /** @type {CodeLine} */(line);
};

/** @private */
CodeParser.prototype._add_invalid_lines = function(){
var _self = this;
  var top_block;
  top_block = _self._top_block();
  _self._invalid_lines.forEach(
  /** @param {SectionLine} line */
  function(line){
    top_block.add(line);
  });
  _self._invalid_lines = [];
};

/** @private */
CodeParser.prototype._pop_rest = function(){
var _self = this;
  // pop all the rest of blocks except one.
  while (_self._blocks.length > 1){
    _self._blocks.pop();
  }
};

/** @private */
CodeParser.prototype._top_block = function(){
var _self = this;
  // there should be at least the root block.
  return _self._blocks[_self._blocks.length - 1];
};
goog.provide('CodeScope');

/**
 * @param {!Context} context
 * @param {SectionHead=} opt_head
 * @constructor
 */
var CodeScope = function(context, opt_head){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {SectionHead}
   * @private
   */
  this._head = opt_head === undefined ? (new GlobalCode()) : opt_head;
};
CodeScope.prototype._classname = 'CodeScope';

/** @param {Array.<string>} lines */
CodeScope.prototype.process_lines = function(lines){
var _self = this;
  var i;
  i = 0;
  _self.process(lines.map(
  /** @param {string} line */
  function(line){
    return new InputLine(line, i++);
  }));
};

/** @param {Array.<InputLine>} input_lines */
CodeScope.prototype.process = function(input_lines){
var _self = this;
  new CodeParser(_self._context, _self._head).parse(input_lines);
  _self._head.transform();
};

CodeScope.prototype.output = function(){
var _self = this;
  return arr_flatten(_self._head.output()).map(
  /** @param {string} line */
  function(line){
    return line.replace(/\s*$/, '');
  });
};
goog.provide('transform_to_js');
goog.provide('need_compile');
goog.provide('compile_files');

/**
 * @param {string} basedir
 * @param {string} infile
 * @param {string} outfile
 */
var transform_to_js = function(basedir, infile, outfile){
  var pkg_name;
  pkg_name = infile.replace(/[\/\\][^\/\\]*$/, '');
  if (basedir && pkg_name.indexOf(basedir) == 0){
    // strip off the basedir.
    pkg_name = pkg_name.substr(basedir.length);
  }
  pkg_name = pkg_name.replace(/^[\/\\]*/, '').replace(/[\/\\]/, '.');

  var c;
  c = new FileScope(pkg_name);
  var input;
  input = _fs.readFileSync(infile, 'utf-8');
  c.process_lines(input.split('\n'));
  _fs.writeFileSync(
    outfile,
    c.provides().join('\n') + '\n\n' + c.output().join('\n'),
    'utf-8'
  );
  _fs.writeFileSync(
    outfile.replace(/\.js$/, '.tk'),
    JSON.stringify(c.types.extract()),
    'utf-8'
  );
};

/**
 * @param {string} src
 * @param {string} dst
 */
var need_compile = function(src, dst){
  if (!_path.existsSync(dst)){
    return true;
  }
  var src_stat;
  src_stat = _fs.statSync(src);
  var dst_stat;
  dst_stat = _fs.statSync(dst);
  return src_stat.mtime.getTime() > dst_stat.mtime.getTime();
};

/**
 * @param {string} basedir
 * @param {Array.<string>} inout_filenames
 */
var compile_files = function(basedir, inout_filenames){
  var i;
  i = 0;
  while (i < inout_filenames.length){
    var infile;
    infile = inout_filenames[i++];
    var outfile;
    outfile = inout_filenames[i++];

    var logstr;
    logstr = '[' + infile + ' => ' + outfile + '] ';
    if (!_path.existsSync(infile)){
      console.error(logstr + 'input not found');
    }
    else if (need_compile(infile, outfile)){
      console.log(logstr + 'compiling');
      transform_to_js(basedir, infile, outfile);
    }
    else{
      console.log(logstr + 'skipping');
    }
  }
};
goog.provide('Context');

/**
 * @param {!Package} pkg
 * @constructor
 */
var Context = function(pkg){
var _self = this;
  /**
   * @type {!Package}
   * @private
   */
  this._pkg = pkg;
  /**
   * @type {!Name}
   * @private
   */
  this._name = (new Name(_self._pkg, ''));
  /**
   * @type {Class}
   * @private
   */
  this._cls = (null);
  /**
   * @type {boolean}
   * @private
   */
  this._is_ctor = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._is_method = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._is_file_scope = (false);
};
Context.prototype._classname = 'Context';
/** @type {!Package} */
Context.prototype.pkg;
Context.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
Context.prototype.__defineSetter__('pkg', function(value) {
this._pkg = value;
});
/** @type {!Name} */
Context.prototype.name;
Context.prototype.__defineGetter__('name', function() {
return this._name;
});
Context.prototype.__defineSetter__('name', function(value) {
this._name = value;
});
/** @type {Class} */
Context.prototype.cls;
Context.prototype.__defineGetter__('cls', function() {
return this._cls;
});
Context.prototype.__defineSetter__('cls', function(value) {
this._cls = value;
});
/** @type {boolean} */
Context.prototype.is_ctor;
Context.prototype.__defineGetter__('is_ctor', function() {
return this._is_ctor;
});
Context.prototype.__defineSetter__('is_ctor', function(value) {
this._is_ctor = value;
});
/** @type {boolean} */
Context.prototype.is_method;
Context.prototype.__defineGetter__('is_method', function() {
return this._is_method;
});
Context.prototype.__defineSetter__('is_method', function(value) {
this._is_method = value;
});
/** @type {boolean} */
Context.prototype.is_file_scope;
Context.prototype.__defineGetter__('is_file_scope', function() {
return this._is_file_scope;
});
Context.prototype.__defineSetter__('is_file_scope', function(value) {
this._is_file_scope = value;
});

/** @return {!Context} */
Context.prototype.clone = function(){
var _self = this;
  var c;
  c = new Context(_self._pkg);
  var p;
  for (p in _self){
    if (_self.hasOwnProperty(p)){
      c[p] = _self[p];
    }
  }
  return c;
};
goog.provide('OutputSection');
goog.provide('FileScope');

/*
parse file scope and separate code sections from comments.
*/
/** @typedef {GlobalComment|CodeSection} */
var OutputSection;

/**
 * @param {string} pkg_name
 * @constructor
 */
var FileScope = function(pkg_name){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = (new Context(new Package(pkg_name)));
  /**
   * @type {Array.<!Name>}
   * @private
   */
  this._provides = ([]);
  /**
   * @type {TypeSet}
   * @private
   */
  this._types = (new TypeSet());
  /**
   * @type {Array.<OutputSection>}
   * @private
   */
  this._list = (null);

  _self._context.is_file_scope = true;
};
FileScope.prototype._classname = 'FileScope';
/** @type {!Context} */
FileScope.prototype.context;
FileScope.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {TypeSet} */
FileScope.prototype.types;
FileScope.prototype.__defineGetter__('types', function() {
return this._types;
});
/*
}
*/

/** @param {Array.<string>} input */
FileScope.prototype.process_lines = function(input){
var _self = this;
  var gen;
  gen = new SectionGenerator(_self);
  var input_list;
  input_list = new InputParser(input).parse();
  _self._list = input_list.map(
  /**
   * @param {GlobalComment|InputSection} section
   * @param {number} index
   */
  function(section, index){
    // convert InputSection to CodeSection and leave GlobalComment as is.
    return section instanceof InputSection ? gen.generate(
      section.header,
      section.lines
    ) : section;
  });
};

/**
 * @param {!Name} name
 * @return {!Context}
 */
FileScope.prototype.copy_context = function(name){
var _self = this;
  var ctxt;
  ctxt = _self._context.clone();
  ctxt.name = name;
  ctxt.cls = _self._context.cls;
  ctxt.is_file_scope = _self._context.is_file_scope;
  return ctxt;
};

/**
 * @param {string} name
 * @return {!Context}
 */
FileScope.prototype.copy_context_with_name = function(name){
var _self = this;
  var fullname;
  fullname = new Name(_self._context.pkg, name);
  _self._provides.push(fullname);
  return _self.copy_context(fullname);
};

/** @return {Array.<string>} */
FileScope.prototype.provides = function(){
var _self = this;
  return _self._provides.map(
  /** @param {Name} provide */
  function(provide){
    return "goog.provide('" + provide.ref() + "');";
  });
};

/** @return {Array.<string>} */
FileScope.prototype.output = function(){
var _self = this;
  return arr_flatten(_self._list.map(
  /** @param {OutputSection} elem */
  function(elem){
    return elem.output();
  }));
};
goog.provide('GlobalComment');

/*
comment section in a file.
*/
/**
 * @param {Array.<InputLine>} lines
 * @constructor
 */
var GlobalComment = function(lines){
var _self = this;
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._lines = lines;
};
GlobalComment.prototype._classname = 'GlobalComment';

GlobalComment.prototype.output = function(){
var _self = this;
  var result;
  result = [];
  var buffer;
  buffer = [];
  var state;
  state = 's';
  _self._lines.forEach(
  /** @param {InputLine} line */
  function(line){
    switch (state){
      // starting state -- output all the blank lines as is.
      case 's':;
      if (!line.is_blank){
        // first non-blank.
        result.push(buffer);
        buffer = [];
        state = 'n';
      }
      break;

      // in non-blank line section.
      case 'n':;
      if (line.is_blank){
        state = 'a';
      }
      break;

      // blank line immediately following a non-blank.
      case 'a':;
      if (line.is_blank){
        // run of blank lines is long enough now. flush the comments.
        result.push(['/*', buffer.splice(0, buffer.length - 1), '*/']);
        state = 'b';
      }
      else{
        state = 'n';
      }
      break;

      // b: blank line section.
      case 'b':;
      if (!line.is_blank){
        result.push(buffer);
        buffer = [];
        state = 'n';
      }
      break;
    }
    buffer.push(line.line);
  });

  switch (state){
    // still in the starting state.
    case 's':;
    result.push(buffer);
    break;

    // in non-blank line section.
    case 'n':;
    result.push(['/*', buffer, '*/']);
    break;

    // one blank line immediately following a non-blank.
    case 'a':;
    // run of blank lines is long enough now. flush the comments.
    result.push(['/*', buffer.splice(0, buffer.length - 1), '*/']);
    result.push(buffer);
    break;

    // b: blank line section.
    case 'b':;
    result.push(buffer);
    break;
  }

  return result;
};
goog.provide('IndentBlock');

/*
TODO: change marker's type to BlockType when it's enum.
*/
/**
 * @param {number} line_no
 * @param {number} indent
 * @param {SectionHead} head
 * @constructor
 */
var IndentBlock = function(line_no, indent, head){
var _self = this;
  /**
   * @type {number}
   * @private
   */
  this._line_no = line_no;
  /**
   * @type {number}
   * @private
   */
  this._indent = indent;
  /**
   * @type {SectionHead}
   * @private
   */
  this._head = head;
  /**
   * @type {Array.<SectionLine>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {number}
   * @private
   */
  this._marker = (BlockType.BLOCK);
};
IndentBlock.prototype._classname = 'IndentBlock';
/** @type {number} */
IndentBlock.prototype.line_no;
IndentBlock.prototype.__defineGetter__('line_no', function() {
return this._line_no;
});
/** @type {number} */
IndentBlock.prototype.indent;
IndentBlock.prototype.__defineGetter__('indent', function() {
return this._indent;
});

  // TODO: enum
  var BlockType;
  BlockType = {
    BLOCK: 0,
    OBJ: 1,
    ARRAY: 2,
    PARAMS: 3
  };

  var _BLOCK_OPEN;
  _BLOCK_OPEN = ['{', '{', '[', '('];
  var _LINE_SUFFIX;
  _LINE_SUFFIX = [';', ',', ',', ','];
  var _END_SUFFIX;
  _END_SUFFIX = [';', '', '', ''];
  var _BLOCK_CLOSE;
  _BLOCK_CLOSE = ['}', '}', ']', ')'];

/** @param {SectionLine} line */
IndentBlock.prototype.add = function(line){
var _self = this;
  _self._lines.push(line);
};

IndentBlock.prototype.last_line = function(){
var _self = this;
  return _self._lines[_self._lines.length - 1];
};

/**
 * @param {function(SectionLine, number)} cb
 * @param {Object} ctxt
 */
IndentBlock.prototype.each_line = function(cb, ctxt){
var _self = this;
  _self._lines.forEach(cb, ctxt);
};

IndentBlock.prototype.head = function(){
var _self = this;
  return _self._head;
};

/*
TODO: change marker's type to BlockType when it's enum.
*/
/** @param {number=} marker */
IndentBlock.prototype.transform = function(marker){
var _self = this;
  if (marker !== undefined){
    _self._marker = marker;
  }
  _self._lines.forEach(
  /** @param {SectionLine} line */
  function(line){
    if (!(line instanceof InvalidLine)){
      line.transform();
    }
  });
};

/** @return {string} */
IndentBlock.prototype.start_str = function(){
var _self = this;
  // string to open the block.
  return _BLOCK_OPEN[_self._marker];
};

/** @return {string} */
IndentBlock.prototype.end_str = function(){
var _self = this;
  return _BLOCK_CLOSE[_self._marker];
};

/** @return {BlockOutput} */
IndentBlock.prototype.output = function(){
var _self = this;
  // find the last valid line.
  var last_index;
  last_index = -1;
  _self._lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i){
    if (!(line instanceof InvalidLine) && !line.param){
      last_index = i;
    }
  });
  assert(
    last_index >= 0 || _self._marker == BlockType.BLOCK,
    _self._lines.length ? _self._lines[0].input : UnknownInputLine,
    'block with no valid lines: ' + _self
  );

  var out;
  out = new BlockOutput();
  var accum_suffix;
  accum_suffix = '';
  _self._lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i){
    var out_line;
    out_line = line.output();
    if (line instanceof InvalidLine){
      accum_suffix += out_line.line_suffix;
      out_line.line_suffix = '';
    }
    else{
      var line_terminator;
      line_terminator = i == last_index ? _END_SUFFIX[_self._marker] : _LINE_SUFFIX[_self._marker];
      out_line.line_suffix = accum_suffix + out_line.line_suffix;
      if (!line.is_block_statement){
        out_line.line_suffix += line_terminator;
      }
      accum_suffix = '';
    }
    out.append_line(out_line);
  });
  return out;
};
goog.provide('InputLine');

/*
a line of input file. keeps track of the row index.
*/
/**
 * @param {string} line
 * @param {number} row_index
 * @constructor
 */
var InputLine = function(line, row_index){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._line = line;
  /**
   * @type {number}
   * @private
   */
  this._row_index = row_index;
};
InputLine.prototype._classname = 'InputLine';
/** @type {string} */
InputLine.prototype.line;
InputLine.prototype.__defineGetter__('line', function() {
return this._line;
});
/** @type {number} */
InputLine.prototype.row_index;
InputLine.prototype.__defineGetter__('row_index', function() {
return this._row_index;
});

/** @type {number} */
InputLine.prototype.line_no;
InputLine.prototype.__defineGetter__('line_no', function() {
var _self = this;
  return _self._row_index + 1;
});

/*
the line contents with indentation stripped off.
trailing whitespace should have been stripped already.
*/
/** @type {string} */
InputLine.prototype.trim;
InputLine.prototype.__defineGetter__('trim', function() {
var _self = this;
  var re;
  re = /\S.*/.exec(_self._line);
  return re ? re[0] : '';
});

/** @type {boolean} */
InputLine.prototype.starts_with_colon;
InputLine.prototype.__defineGetter__('starts_with_colon', function() {
var _self = this;
  return _self._line.substr(0, 1) == ':';
});

/** @type {boolean} */
InputLine.prototype.is_blank;
InputLine.prototype.__defineGetter__('is_blank', function() {
var _self = this;
  return /^\s*$/.test(_self._line);
});

/** @type {boolean} */
InputLine.prototype.is_indented;
InputLine.prototype.__defineGetter__('is_indented', function() {
var _self = this;
  return /^\s/.test(_self._line);
});

/** @type {number} */
InputLine.prototype.indent;
InputLine.prototype.__defineGetter__('indent', function() {
var _self = this;
  var re;
  re = /\S/.exec(_self._line);
  return re ? re.index : 0;
});

  var UnknownInputLine;
  UnknownInputLine = new InputLine('', -1);
goog.provide('InputParser');

/*
parses input lines into lines and sections.
'line' is used only during processing.
*/
/**
 * @param {Array.<string>} input
 * @constructor
 */
var InputParser = function(input){
var _self = this;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._input = input;
  /**
   * @type {Array.<GlobalComment|InputSection>}
   * @private
   */
  this._result = ([]);
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._buffer = ([]);
  /**
   * @type {number?}
   * @private
   */
  this._last_valid_index = (null);
};
InputParser.prototype._classname = 'InputParser';

/** @return {Array.<GlobalComment|InputSection>} */
InputParser.prototype.parse = function(){
var _self = this;
  _self._input.forEach(
  /**
   * @param {string} line
   * @param {number} index
   */
  function(line, index){
    line = line.trimRight();
    _self._process_line(new InputLine(line, index));
  });
  _self._flush_buffer();
  return _self._result;
};

/**
 * @param {InputLine} line
 * @private
 */
InputParser.prototype._process_line = function(line){
var _self = this;
  if (line.starts_with_colon){
    // should be a start of a code section.
    _self._flush_buffer();
    _self._last_valid_index = 0;
  }
  else if (line.is_indented){
    // indented line -- continues either comment or code section.
    if (_self._last_valid_index !== null){
      _self._last_valid_index = _self._buffer.length;
    }
  }
  else if (!line.is_blank){
    // global comment.
    if (_self._last_valid_index !== null){
      // close the code section.
      _self._flush_buffer();
    }
  }
  // anything else is invalid line -- continues either comment or code section.
  _self._buffer.push(line);
};

/** @private */
InputParser.prototype._flush_buffer = function(){
var _self = this;
  while (_self._buffer.length){
    var next_buffer;
    next_buffer = [];
    if (_self._last_valid_index !== null){
      var section;
      section = new InputSection(_self._buffer[0]);
      _self._result.push(section);
      _self._buffer.forEach(
      /**
       * @param {InputLine} line
       * @param {number} index
       */
      function(line, index){
        if (index == 0){
          // we already passed the header line to section.
          return;
        }
        else if (index <= _self._last_valid_index){
          section.push(line);
        }
        else{
          // end of section invaild lines.
          next_buffer.push(line);
        }
      });
    }
    else{
      // we'll give buffer a new array so no need to clone for global comment.
      _self._result.push(new GlobalComment(_self._buffer));
    }
    _self._last_valid_index = null;
    _self._buffer = next_buffer;
  }
};
goog.provide('InputSection');

/*
input code section.
*/
/**
 * @param {InputLine} header
 * @constructor
 */
var InputSection = function(header){
var _self = this;
  /**
   * @type {InputLine}
   * @private
   */
  this._header = header;
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {CodeSection}
   * @private
   */
  this._code = (null);
};
InputSection.prototype._classname = 'InputSection';
/** @type {InputLine} */
InputSection.prototype.header;
InputSection.prototype.__defineGetter__('header', function() {
return this._header;
});
/** @type {Array.<InputLine>} */
InputSection.prototype.lines;
InputSection.prototype.__defineGetter__('lines', function() {
return this._lines;
});
/** @type {CodeSection} */
InputSection.prototype.code;
InputSection.prototype.__defineGetter__('code', function() {
return this._code;
});
InputSection.prototype.__defineSetter__('code', function(value) {
this._code = value;
});

/** @param {InputLine} line */
InputSection.prototype.push = function(line){
var _self = this;
  _self._lines.push(line);
};
goog.provide('InterlacedLine');

/*
fragments of string interlaced by block references.
maintains:
- at least one fragment.
- exactly one more fragments than blocks.
*/
/** @constructor */
var InterlacedLine = function(){
var _self = this;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._fragments = (['']);
  /**
   * @type {Array.<Object>}
   * @private
   */
  this._blocks = ([]);
};
InterlacedLine.prototype._classname = 'InterlacedLine';
/** @type {Array.<Object>} */
InterlacedLine.prototype.blocks;
InterlacedLine.prototype.__defineGetter__('blocks', function() {
return this._blocks;
});

/** @return {string} */
InterlacedLine.prototype.first_fragment = function(){
var _self = this;
  return _self._fragments[0];
};

/** @param {string} str */
InterlacedLine.prototype.add_str = function(str){
var _self = this;
  var last_idx;
  last_idx = _self._fragments.length - 1;
  _self._fragments[last_idx] = _self._fragments[last_idx] + str;
};

/** @param {Object} block */
InterlacedLine.prototype.add_block = function(block){
var _self = this;
  _self._fragments.push('');
  _self._blocks.push(block);
};

/**
 * @param {function(Object, string, number)} cb
 * @param {*=} ctxt
 */
InterlacedLine.prototype.each = function(cb, ctxt){
var _self = this;
  _self._blocks.forEach(
  /**
   * @param {Object} block
   * @param {number} i
   */
  function(block, i){
    cb.call(ctxt, block, _self._fragments[i + 1], i);
  });
};
goog.provide('InvalidLine');

/*
either blank line or comment only line.
*/
/**
 * @param {InputLine} input
 * @constructor
 */
var InvalidLine = function(input){
var _self = this;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
};
InvalidLine.prototype._classname = 'InvalidLine';
/** @type {InputLine} */
InvalidLine.prototype.input;
InvalidLine.prototype.__defineGetter__('input', function() {
return this._input;
});

/** @type {string} */
InvalidLine.prototype.str;
InvalidLine.prototype.__defineGetter__('str', function() {
var _self = this;
  return _self._input.line;
});

/** @return {LineOutput} */
InvalidLine.prototype.output = function(){
var _self = this;
  var out;
  out = new LineOutput(_self._input);
  out.append_line(_self._input.trim);
  return out;
};
goog.provide('SectionLine');
goog.provide('LineCategorizer');

/** @typedef {CodeLine|SeparatorLine|InvalidLine} */
var SectionLine;

/**
 * @param {!Context} context
 * @constructor
 */
var LineCategorizer = function(context){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
};
LineCategorizer.prototype._classname = 'LineCategorizer';

/**
 * @param {InputLine} input
 * @return {SectionLine}
 */
LineCategorizer.prototype.create_line = function(input){
var _self = this;
  var parsed;
  parsed = new LineParser(input);
  if (!parsed.is_valid){
    return new InvalidLine(input);
  }
  if (parsed.is_separator){
    return new SeparatorLine(input, parsed);
  }
  return new CodeLine(_self._context, input, parsed);
};
goog.provide('LineDecoder');

/*
decodes blockc markers.
*/
/**
 * @param {!Context} context
 * @param {Array.<string>} line
 * @param {InputLine} input_line
 * @constructor
 */
var LineDecoder = function(context, line, input_line){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._line = line;
  /**
   * @type {InputLine}
   * @private
   */
  this._input_line = input_line;
  /**
   * @type {!InterlacedLine}
   * @private
   */
  this._fragments = (new InterlacedLine);
  // whether this line is a statement that comes with a block, like 'if'.
  /**
   * @type {boolean}
   * @private
   */
  this._is_block_statement = (false);
};
LineDecoder.prototype._classname = 'LineDecoder';
/** @type {boolean} */
LineDecoder.prototype.is_block_statement;
LineDecoder.prototype.__defineGetter__('is_block_statement', function() {
return this._is_block_statement;
});

/** @param {Array.<IndentBlock>} blocks */
LineDecoder.prototype.transform = function(blocks){
var _self = this;
  // make the fragments and blocks.
  // pass a shallow copy of the blocks.
  _self._split_to_fragments(blocks.slice(0));
  _self._transform_blocks();
};

/**
 * @param {Array.<IndentBlock>} blocks
 * @private
 */
LineDecoder.prototype._split_to_fragments = function(blocks){
var _self = this;
  // go thru all the matches one by one.
  _self._line.forEach(
  /**
   * @param {string} seg
   * @param {number} i
   */
  function(seg, i){
    if (/^['"\/]/.test(seg)){
      // string, regular expression, and comment don't need to be split.
      _self._fragments.add_str(seg);
    }
    else{
      _self._split_segment(seg, i == _self._line.length - 1, blocks);
    }
  });
};

/**
 * @param {string} seg
 * @param {boolean} last_seg
 * @param {Array.<IndentBlock>} blocks
 * @private
 */
LineDecoder.prototype._split_segment = function(seg, last_seg, blocks){
var _self = this;
  var re;
  re = /(\{#\}|\[#\]|\(#\)|##?)/g;
  var last_index;
  last_index = 0;
  var match;
  match = re.exec(seg);
  var sub_context;
  sub_context = null;
  while (match){
    _self._fragments.add_str(seg.substring(last_index, match.index));
    var block;
    block = {marker: match[1]};
    if (blocks.length == 0){
      warn(_self._input_line, 'ran out of blocks: ' + seg);
    }
    else{
      var b;
      b = blocks.shift();
      if (block.marker == '##'){
        if (!sub_context){
          sub_context = _self._context.clone();
          sub_context.is_file_scope = false;
        }
        block.params = new ParamSet(sub_context, b);
      }
      block.block = b;
    }

    _self._fragments.add_block(block);
    last_index = re.lastIndex;
    match = re.exec(seg);
  }

  var last_fragment;
  last_fragment = seg.substr(last_index);
  if (last_fragment){
    _self._fragments.add_str(last_fragment);
    if (last_seg && blocks.length > 0){
      _self._fragments.add_block({marker: '#', block: blocks.shift()});
      _self._is_block_statement = true;
    }
  }
  assert(!last_seg || blocks.length == 0, _self._input_line, 'too many blocks for the #s');
};

/** @private */
LineDecoder.prototype._transform_blocks = function(){
var _self = this;
  _self._fragments.blocks.forEach(
  /** @param {Object} b */
  function(b){
    // transform the blocks.
    if (b.params){
      b.params.transform();
    }
    if (b.block){
      b.block.transform({
        '##': BlockType.BLOCK,
        '#': BlockType.BLOCK,
        '{#}': BlockType.OBJ,
        '[#]': BlockType.ARRAY,
        '(#)': BlockType.PARAMS
      }[b.marker]);
    }
  });
};

/** @return {Array.<string>} */
LineDecoder.prototype.first_line = function(){
var _self = this;
  // there should be at least one fragment.
  return _self._compose_line(_self._fragments.first_fragment(), 0);
};

/** @param {function(IndentBlock, Array.<string>)} cb */
LineDecoder.prototype.each_fragment = function(cb){
var _self = this;
  _self._fragments.each(
  /**
   * @param {Object} b
   * @param {string} f
   * @param {number} i
   */
  function(b, f, i){
    cb(b.block, _self._compose_line(
      b.block.end_str() + f,
      i + 1
    ));
  });
};

/**
 * @param {string} prefix
 * @param {number} i
 * @private
 */
LineDecoder.prototype._compose_line = function(prefix, i){
var _self = this;
  if (_self._fragments.blocks.length <= i){
    return [prefix];
  }

  var b;
  b = _self._fragments.blocks[i];
  var bstart;
  bstart = [b.block.start_str()];
  if (!b.params){
    return [prefix + bstart];
  }
  if (b.params.is_decl_empty()){
    return [prefix + 'function(' + b.params.output_params() + ')' + bstart];
  }

  // we don't try to merge the prefix into first line.
  return arr_flatten([
    prefix,
    doc_lines(b.params.output_decls()),
    'function(' + b.params.output_params() + ')' + bstart
  ]);
};
goog.provide('LineOutput');

/*
output lines corresponds to one input line.
*/
/**
 * @param {InputLine} input
 * @constructor
 */
var LineOutput = function(input){
var _self = this;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
  /**
   * @type {number}
   * @private
   */
  this._indent = (input.indent);
  /**
   * @type {Array.<string>}
   * @private
   */
  this._prefix_lines = ([]);
  /**
   * @type {Array.<BlockOutput|string>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {string}
   * @private
   */
  this._line_prefix = ('');
  /**
   * @type {string}
   * @private
   */
  this._line_suffix = ('');
  /**
   * @type {Array.<string>}
   * @private
   */
  this._tail_comment = ([]);
};
LineOutput.prototype._classname = 'LineOutput';
/** @type {number} */
LineOutput.prototype.indent;
LineOutput.prototype.__defineGetter__('indent', function() {
return this._indent;
});
LineOutput.prototype.__defineSetter__('indent', function(value) {
this._indent = value;
});
/** @type {string} */
LineOutput.prototype.line_prefix;
LineOutput.prototype.__defineGetter__('line_prefix', function() {
return this._line_prefix;
});
LineOutput.prototype.__defineSetter__('line_prefix', function(value) {
this._line_prefix = value;
});
/** @type {string} */
LineOutput.prototype.line_suffix;
LineOutput.prototype.__defineGetter__('line_suffix', function() {
return this._line_suffix;
});
LineOutput.prototype.__defineSetter__('line_suffix', function(value) {
this._line_suffix = value;
});
/** @type {Array.<string>} */
LineOutput.prototype.tail_comment;
LineOutput.prototype.__defineGetter__('tail_comment', function() {
return this._tail_comment;
});
LineOutput.prototype.__defineSetter__('tail_comment', function(value) {
this._tail_comment = value;
});

/** @param {string} line */
LineOutput.prototype.append_prefix_line = function(line){
var _self = this;
  _self._prefix_lines.push(line);
};

/** @param {string} line */
LineOutput.prototype.append_line = function(line){
var _self = this;
  _self._lines.push(line);
};

/** @param {BlockOutput} block */
LineOutput.prototype.append_block = function(block){
var _self = this;
  _self._lines.push(block);
};

/** @param {Array.<string>} lines */
LineOutput.prototype.append_lines = function(lines){
var _self = this;
  lines.forEach(
  /** @param {string} line */
  function(line){
    _self._lines.push(line);
  });
};

LineOutput.prototype.remove_empty_lines = function(){
var _self = this;
  _self._lines = _self._lines.filter(
  /** @param {BlockOutput|string} line */
  function(line){
    return line;
  });
};

/** @type {Array.<string>} */
LineOutput.prototype.output;
LineOutput.prototype.__defineGetter__('output', function() {
var _self = this;
  var result;
  result = [];
  var indent;
  indent = whitespaces(_self._indent);
  _self._prefix_lines.forEach(
  /** @param {string} line */
  function(line){
    result.push(line ? indent + line : '');
  });
  _self._lines.forEach(
  /**
   * @param {string|BlockOutput} line
   * @param {number} i
   */
  function(line, i){
    if (line instanceof BlockOutput){
      result = result.concat(line.output);
    }
    else{
      var to_add;
      to_add = line;
      if (i == 0 && _self._line_prefix){
        to_add = _self._line_prefix + to_add;
      }
      if (i == _self._lines.length - 1 && _self._line_suffix){
        to_add += _self._line_suffix;
      }
      if (to_add){
        to_add = indent + to_add;
      }
      result.push(to_add);
    }
  });
  _self._tail_comment.forEach(
  /** @param {string} c */
  function(c){
    result.push(indent + c);
  });
  return result;
});
goog.provide('LineParser');

/*
First pass line parsing for constructing the block structure.
*/

/**
 * @param {InputLine} input
 * @constructor
 */
var LineParser = function(input){
var _self = this;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;

  /**
   * @type {boolean}
   * @private
   */
  this._is_valid = (false);
  /**
   * @type {number}
   * @private
   */
  this._indent = (0);
  /**
   * @type {boolean}
   * @private
   */
  this._is_continuation = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._is_separator = (false);

  _self._process();
};
LineParser.prototype._classname = 'LineParser';
/** @type {boolean} */
LineParser.prototype.is_valid;
LineParser.prototype.__defineGetter__('is_valid', function() {
return this._is_valid;
});
/** @type {number} */
LineParser.prototype.indent;
LineParser.prototype.__defineGetter__('indent', function() {
return this._indent;
});
/** @type {boolean} */
LineParser.prototype.is_continuation;
LineParser.prototype.__defineGetter__('is_continuation', function() {
return this._is_continuation;
});
/** @type {boolean} */
LineParser.prototype.is_separator;
LineParser.prototype.__defineGetter__('is_separator', function() {
return this._is_separator;
});

/** @private */
LineParser.prototype._process = function(){
var _self = this;
  if (/^\s*$/.test(_self._input.line) || /^\s*\/\//.test(_self._input.line)){
    // blank or comment line. Nothing to be done.
    return;
  }
  _self._is_valid = true;

  _self._check_spaces();
  _self._check_continuation();
  _self._check_separator();
};

/** @private */
LineParser.prototype._check_spaces = function(){
var _self = this;
  var spaces_re;
  spaces_re = /^(\s*)(.*[\S])(\s*)$/.exec(_self._input.line);

  _self._indent = spaces_re[1].length;
  if (!/ */.test(spaces_re[1])){
    warn(_self._input, 'non-ascii 0x20 space for indentation');
  }

  if (spaces_re[3] != ''){
    warn(_self._input, 'trailing space');
  }
};

/** @private */
LineParser.prototype._check_continuation = function(){
var _self = this;
  var cont_re;
  cont_re = /^\s*\|/.exec(_self._input.line);
  _self._is_continuation = !!cont_re;
};

/** @private */
LineParser.prototype._check_separator = function(){
var _self = this;
  _self._is_separator = /^\s*--\s*$/.test(_self._input.line);
};
goog.provide('LineTransformer');

/**
 * @param {!Context} context
 * @param {InputLine} input
 * @constructor
 */
var LineTransformer = function(context, input){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
};
LineTransformer.prototype._classname = 'LineTransformer';

/**
 * @param {string} name
 * @return {string}
 */
LineTransformer.prototype.pkg_ref = function(name){
var _self = this;
  // relative package reference.
  return _self._context.pkg.replace(name);
};

/**
 * @param {string} type
 * @return {string}
 */
LineTransformer.prototype.cast = function(type){
var _self = this;
  return '/** @type {' + new TypeDecoder(_self._context.pkg, type).output() + '} */';
};

/**
 * @param {string} type
 * @return {string}
 */
LineTransformer.prototype.type = function(type){
var _self = this;
  return new TypeDecoder(_self._context.pkg, type).output();
};

/**
 * @param {string} args
 * @return {string}
 */
LineTransformer.prototype.parent_call = function(args){
var _self = this;
  var end_str;
  end_str = args ? ', ' + args + ')' : ')';
  if (_self._context.is_ctor){
    return _self._context.cls.ctor.parent_name() + '.call(this' + end_str;
  }
  else if (_self._context.is_method){
    return "goog.base(this, '" + _self._context.name.id + "'" + end_str;
  }
  else{
    warn(_self._input, 'parent call appeared in non-ctor / non-method.');
    return '%(' + args + ')';
  }
};
goog.provide('warn');
goog.provide('assert');

/**
 * @param {InputLine} line
 * @param {string=} opt_msg
 */
var warn = function(line, opt_msg){
  var msg = opt_msg === undefined ? ('*warning*') : opt_msg;
  console.warn(msg + ' (line ' + line.line_no + '): ' + line.line);
};

/**
 * @param {*} check
 * @param {InputLine=} opt_line
 * @param {string=} opt_msg
 */
var assert = function(check, opt_line, opt_msg){
  var line = opt_line === undefined ? (UnknownInputLine) : opt_line;
  var msg = opt_msg === undefined ? ('*assertion*') : opt_msg;
  console.assert(
    check,
    msg + (line ? ' (line ' + line.line_no + '): ' + line.line : '')
  );
};
goog.provide('Member');

/*
pseudo member is a place holder for class members that don't exist, but there are accessors for.
*/
/**
 * @param {string} name
 * @param {TypeDecoder} type
 * @param {string} access_type
 * @param {boolean} is_pseudo
 * @constructor
 */
var Member = function(name, type, access_type, is_pseudo){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {TypeDecoder}
   * @private
   */
  this._type = type;
  /**
   * @type {string}
   * @private
   */
  this._access_type = access_type;
  /**
   * @type {boolean}
   * @private
   */
  this._is_pseudo = is_pseudo;
  /**
   * @type {boolean}
   * @private
   */
  this._declared = (false);
};
Member.prototype._classname = 'Member';

/*
returns an array with member declaration if it hasn't been output already.
returns an empty array otherwise.
*/
/**
 * @param {!Name} class_name
 * @return {Array.<string>}
 */
Member.prototype.output_decl = function(class_name){
var _self = this;
  if (_self._declared){
    return [];
  }
  _self._declared = true;
  // TODO: this member decl always allows setting a value to it even when only the
  // getter is provided.
  return [
    '/** @type {' + _self._type.output() + '}' + ' */',
    class_name.property(_self._name).decl() + ';'
  ];
};

/*
output a getter or a setter.
*/
/**
 * @param {!Name} class_name
 * @param {boolean} is_getter
 * @param {Array} body
 * @param {ParamSet=} params
 * @return {Array}
 */
Member.prototype.output_accessor = function(class_name, is_getter, body, params){
var _self = this;
  var p;
  p = _self._is_pseudo && params ? params.output_params() : 'value';
  return [
    is_getter ? (
      class_name.property('__defineGetter__').decl() + "('" + _self._name + "', function() {"
    ) : (
      class_name.property('__defineSetter__').decl() + "('" + _self._name + "', function(" + p + ') {'
    ),
    body,
    '});'
  ];
};

/*
produce necessary accessor methods based on the access type specification.
*/
/**
 * @param {!Name} class_name
 * @return {Array}
 */
Member.prototype.output_accessors = function(class_name){
var _self = this;
  if (!_self._access_type || _self._is_pseudo){
    return [];
  }
  var result;
  result = [_self.output_decl(class_name)];
  if ('+&'.indexOf(_self._access_type) >= 0){
    result.push(_self.output_accessor(class_name, true, ['return this._' + _self._name + ';']));
  }
  if ('*&'.indexOf(_self._access_type) >= 0){
    result.push(_self.output_accessor(class_name, false, ['this._' + _self._name + ' = value;']));
  }
  return result;
};
goog.provide('Name');

/*
name in file scope.
*/
/**
 * @param {!Package} pkg
 * @param {string} id
 * @constructor
 */
var Name = function(pkg, id){
var _self = this;
  /**
   * @type {!Package}
   * @private
   */
  this._pkg = pkg;
  /**
   * @type {string}
   * @private
   */
  this._id = id;
};
Name.prototype._classname = 'Name';
/** @type {!Package} */
Name.prototype.pkg;
Name.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
/** @type {string} */
Name.prototype.id;
Name.prototype.__defineGetter__('id', function() {
return this._id;
});

/** @return {string} */
Name.prototype.decl = function(){
var _self = this;
  return (_self._pkg.empty() ? 'var ' : '') + _self._pkg.fullname(_self._id);
};

/** @return {string} */
Name.prototype.ref = function(){
var _self = this;
  return _self._pkg.fullname(_self._id);
};

/**
 * @param {string} id
 * @return {!Name}
 */
Name.prototype.property = function(id){
var _self = this;
  return new Name(new Package(_self.ref() + '.prototype'), id);
};

/** @return {string} */
Name.prototype.oString = function(){
var _self = this;
  return '[' + _self._pkg + ':' + _self._id + ']';
};
goog.provide('Package');

/*
package name.
*/

/**
 * @param {string} pkg
 * @constructor
 */
var Package = function(pkg){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._pkg = pkg;
};
Package.prototype._classname = 'Package';

/** @return {boolean} */
Package.prototype.empty = function(){
var _self = this;
  return !_self._pkg;
};

/**
 * @param {string} id
 * @return {string}
 */
Package.prototype.fullname = function(id){
var _self = this;
  return (_self._pkg ? _self._pkg + '.' : '') + id;
};

/** @param {string} str */
Package.prototype.replace = function(str){
var _self = this;
  var pkg;
  pkg = _self._pkg;
  // up package reference if there are two or more "%"s.
  while (/^\%\%/.test(str)){
    if (pkg){
      // drop the last element.
      pkg = pkg.replace(/\.?[^\.]+$/, '');
    }
    str = str.substr(1);
  }
  // replace "%" with the current package name.
  return str.replace(/^\%(\:\:|\.)/, 
  /**
   * @param {Array.<string>} _
   * @param {string} connector
   */
  function(_, connector){
    return pkg ? pkg + connector : '';
  });
};

/** @param {string} str */
Package.prototype.replace_str = function(str){
var _self = this;
  return str.replace(/\%+(\:\:|\.)/g, 
  /** @param {string} ref */
  function(ref){
    return _self.replace(ref);
  });
};

/** @return {string} */
Package.prototype.toString = function(){
var _self = this;
  return _self._pkg;
};
goog.provide('Param');

/*
Function parameter and / or member declarion.
*/

/**
 * @param {!Context} context
 * @param {boolean} is_ctor
 * @param {InputLine} input
 * @param {parser.Result} parsed
 * @constructor
 */
var Param = function(context, is_ctor, input, parsed){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;

  /**
   * @type {parser.ParamLine}
   * @private
   */
  this._line = (null);
  /**
   * @type {boolean}
   * @private
   */
  this._success = (false);
  /**
   * @type {TypeDecoder}
   * @private
   */
  this._type = (null);
  /**
   * @type {Array.<parser.BlockMarker|string>}
   * @private
   */
  this._value_line = (null);

  if (!(parsed.tokens instanceof parser.ParamLine)){
    return;
  }

  _self._line = parsed.tokens;
  _self._success = true;
  _self._type = new TypeDecoder(_self._context.pkg, _self._line.type);

  _self._value_line = _self._line.init && !_self._line.init.is_empty ? _self._line.init.list : null;
  if (_self.is_member && _self.init_type != '$' && !_self._value_line){
    // member with no initializer or optional param init.
    _self._value_line = ['null'];
  }

  // sanity check the param consistency.
  if (!is_ctor && _self.is_member){
    warn(input, 'member param for non-constructor method');
  }
  if (!_self.is_member && _self.init_type != '?' && _self._value_line){
    warn(input, 'initial value for non-member non-optional');
  }
};
Param.prototype._classname = 'Param';
/** @type {boolean} */
Param.prototype.success;
Param.prototype.__defineGetter__('success', function() {
return this._success;
});
/** @type {TypeDecoder} */
Param.prototype.type;
Param.prototype.__defineGetter__('type', function() {
return this._type;
});
/** @type {Array.<parser.BlockMarker|string>} */
Param.prototype.value_line;
Param.prototype.__defineGetter__('value_line', function() {
return this._value_line;
});

/** @type {boolean} */
Param.prototype.is_member;
Param.prototype.__defineGetter__('is_member', function() {
var _self = this;
  return _self._line.is_member;
});

/** @type {string} */
Param.prototype.name;
Param.prototype.__defineGetter__('name', function() {
var _self = this;
  return _self._line.name;
});

/** @type {string} */
Param.prototype.access_type;
Param.prototype.__defineGetter__('access_type', function() {
var _self = this;
  return _self._line.access;
});

/** @type {string} */
Param.prototype.init_type;
Param.prototype.__defineGetter__('init_type', function() {
var _self = this;
  return _self._line.marker;
});

/** @type {boolean} */
Param.prototype.has_init;
Param.prototype.__defineGetter__('has_init', function() {
var _self = this;
  return !!_self._value_line;
});

/**
 * @return {string}
 * @private
 */
Param.prototype._param_name = function(){
var _self = this;
  return (_self.has_init ? 'opt_' : '') + _self.name;
};

/** @return {string} */
Param.prototype.output_decl = function(){
var _self = this;
  return _self._type && _self.init_type != '' ? ([
    '@param {',
    _self._type.output(),
    _self.init_type == '?' ? '=' : '',
    '} ',
    _self._param_name()
  ].join('')) : '';
};

/** @return {string} */
Param.prototype.output_param = function(){
var _self = this;
  return _self.init_type == '' ? '' : _self._param_name();
};

/*
Variable initialization output as first statements of function body.
*/
/** @param {LineOutput} out */
Param.prototype.output_init = function(out){
var _self = this;
  var pname;
  pname = _self._param_name();

  if (_self.is_member){
    out.append_prefix_line('/**');
    if (_self._type){
      out.append_prefix_line(' * @type {' + _self._type.output() + '}');
    }
    out.append_prefix_line(' * @private');
    out.append_prefix_line(' */');
  }
  if (_self.is_member || _self.has_init){
    out.line_prefix = [
      _self.is_member ? 'this._' : 'var ',
      _self.name,
      ' = '
    ].join('');
    if (_self.init_type != ''){
      out.line_prefix += pname;
      if (_self.has_init){
        out.line_prefix += ' === undefined ? (';
        out.line_suffix = ') : ' + pname;
      }
    }
    else{
      out.line_prefix += '(';
      out.line_suffix = ')';
    }
  }
  else{
    out.remove_empty_lines();
  }
};

/** @return {string} */
Param.prototype.output_argtype = function(){
var _self = this;
  var type;
  type = _self._type.output();
  var re;
  re = /^\!?([a-zA-Z][\w\.]*)$/.exec(type);
  if (!re){
    return 'null';
  }
  var type_name;
  type_name = re[1];
  return ARG_TYPE_REPLACE_MAP[type_name] || type_name;
};

/** @return {?string} */
Param.prototype.argtype = function(){
var _self = this;
  var type;
  type = _self._type.output();
  var re;
  re = /^\!?([a-zA-Z][\w\.]*)$/.exec(type);
  if (!re){
    return null;
  }
  var type_name;
  type_name = re[1];
  return ARG_TYPE_REPLACE_MAP[type_name] || type_name;
};
goog.provide('ParamSet');

  var ARG_TYPE_REPLACE_MAP;
  ARG_TYPE_REPLACE_MAP = {
    'boolean': 'Boolean',
    'function': 'Function',
    'string': 'String',
    'number': 'Number',
    // black list this one because closure compiler warns the refernce to this
    // constructor prevents some optimizations.
    'RegExp': 'null'
  };

/**
 * @param {!Context} context
 * @param {IndentBlock} block
 * @param {boolean=} opt_is_ctor
 * @constructor
 */
var ParamSet = function(context, block, opt_is_ctor){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {IndentBlock}
   * @private
   */
  this._block = block;
  /**
   * @type {boolean}
   * @private
   */
  this._is_ctor = opt_is_ctor === undefined ? (false) : opt_is_ctor;
  /**
   * @type {Array.<!Param>}
   * @private
   */
  this._params = ([]);
  /**
   * @type {TypeDecoder}
   * @private
   */
  this._return_type = (null);
};
ParamSet.prototype._classname = 'ParamSet';

ParamSet.prototype.transform = function(){
var _self = this;
  var param_done;
  param_done = false;
  _self._block.each_line(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i){
    if (param_done){
      return;
    }
    if (line instanceof SeparatorLine){
      param_done = true;
      return;
    }
    if (line instanceof CodeLine && !line.is_continuation){
      var p;
      p = _self._add_line(/** @type {CodeLine} */(line), i);
      if (p){
        line.param = p;
      }
      else{
        param_done = true;
    // skip invalid lines and continuation lines.
      }
    }
  }, _self._context);
};

/**
 * @param {CodeLine} line
 * @param {number} index
 * @return {Param|boolean}
 * @private
 */
ParamSet.prototype._add_line = function(line, index){
var _self = this;
  var p;
  p = new Param(_self._context, _self._is_ctor, line.input, line.parsed);
  if (!p.success){
    if (index != 0 || _self._context.is_file_scope){
      return null;
    }
    // could be the return type.
    return _self._try_return_type(line.str);
  }

  _self._params.push(p);
  if (p.is_member){
    _self._context.cls.add_member(p.name, p.type, p.access_type);
  }
  return p;
};

/**
 * @param {string} line
 * @return {boolean}
 * @private
 */
ParamSet.prototype._try_return_type = function(line){
var _self = this;
  var re;
  re = /^\s*\\(.*)\\\s*$/.exec(line);
  if (!re){
    return false;
  }
  _self._return_type = new TypeDecoder(_self._context.pkg, re[1]);
  return true;
};

/** @param {string} return_type */
ParamSet.prototype.set_return_type = function(return_type){
var _self = this;
  if (return_type){
    _self._return_type = new TypeDecoder(_self._context.pkg, return_type);
  }
};

/** @return {boolean} */
ParamSet.prototype.is_empty = function(){
var _self = this;
  return _self._params.length == 0;
};

/** @return {boolean} */
ParamSet.prototype.is_init_empty = function(){
var _self = this;
  return !_self._params.some(
  /** @param {Param} p */
  function(p){
    return p.is_member || p.init_type == '?';
  });
};

/** @return {boolean} */
ParamSet.prototype.is_decl_empty = function(){
var _self = this;
  return !_self._return_type && !_self._params.some(
  /** @param {Param} p */
  function(p){
    return !!p.type;
  });
};

/** @return {Array.<string>} */
ParamSet.prototype.output_decls = function(){
var _self = this;
  var result;
  result = _self._params.map(
  /** @param {Param} p */
  function(p){
    return p.output_decl();
  }).filter(
  /** @param {string} s */
  function(s){
    return !!s;
  });
  if (_self._return_type){
    result.push('@return {' + _self._return_type.output() + '}');
  }
  return result;
};

/** @return {string} */
ParamSet.prototype.output_params = function(){
var _self = this;
  // function parameter output.
  return _self._params.map(
  /** @param {Param} p */
  function(p){
    return p.output_param();
  }).filter(
  /** @param {string} s */
  function(s){
    return !!s;
  }).join(', ');
};

/** @return {string} */
ParamSet.prototype.output_argtypes = function(){
var _self = this;
  return '[' + _self._params.map(
  /** @param {Param} p */
  function(p){
    return p.output_argtype();
  }).join(', ') + ']';
};

/** @param {CallableType} types */
ParamSet.prototype.set_argtypes = function(types){
var _self = this;
  _self._params.forEach(
  /** @param {!Param} p */
  function(p){
    types.add_arg(p.argtype());
  });
};
goog.provide('SectionGenerator');

/**
 * @param {FileScope} scope
 * @constructor
 */
var SectionGenerator = function(scope){
var _self = this;
  /**
   * @type {FileScope}
   * @private
   */
  this._scope = scope;
};
SectionGenerator.prototype._classname = 'SectionGenerator';

/**
 * @param {InputLine} header
 * @param {Array.<InputLine>} lines
 * @return {CodeSection}
 */
SectionGenerator.prototype.generate = function(header, lines){
var _self = this;
  var section;
  section = null;
  var header_line;
  header_line = header.line.substr(1);
  if (![
    '_create_ctor',
    '_create_method',
    '_create_accessor',
    '_create_global_function',
    '_create_multi_line_str',
    '_create_global_code',
    '_create_native_code',
    '_create_anonymous_scope',
    //'_create_interface'
    '_create_typedef'
    //'_create_var' -- any type including array, map, number, etc.
    //'_create_class_context' -- for adding methods to e.g. Object.
  ].some(
  /** @param {string} method */
  function(method){
    section = _self[method].call(_self, header_line, header);
    if (section){
      section.lines = lines;
      section.close(_self._scope.context.pkg);
      section.set_type(_self._scope.types);
    }
    return !!section;
  })){
    warn(header, 'line starts with colon and not a code section marker');
  }
  return section;
};

/**
 * @param {string} line
 * @return {Constructor}
 * @private
 */
SectionGenerator.prototype._create_ctor = function(line){
var _self = this;
  var re;
  re = /^\:\s*(\w+)\s*(\<\s*(.*\S))?$/.exec(line);
  if (!re){
    return null;
  }

  // need to keep this in a member var too.
  _self._scope.context.cls = new Class();
  var ctor;
  ctor = new Constructor(_self._scope.copy_context_with_name(re[1]), re[3]);
  _self._scope.context.cls.ctor = ctor;
  _self._scope.types.add_ctor(ctor.name());
  if (re[3]){
    _self._scope.types.set_parent(ctor.parent_name());
  }
  return ctor;
};

/**
 * @param {string} line
 * @param {InputLine} header
 * @return {Method}
 * @private
 */
SectionGenerator.prototype._create_method = function(line, header){
var _self = this;
  var re;
  re = /^(\<?)(\@?)\s*([a-zA-Z]\w*)\s*(\\(.*)\\)?$/.exec(line);
  if (!re){
    return null;
  }

  // we should have seen a ctor.
  if (!_self._scope.context.cls){
    warn(header, 'method marker w/o class');
    return null;
  }
  return new Method(
      _self._scope.copy_context(_self._scope.context.cls.method_name((re[2] ? '_' : '') + re[3])),
      re[5],
      !!re[1]
  );
};

/**
 * @param {string} line
 * @param {InputLine} header
 * @return {OverridingAccessor}
 * @private
 */
SectionGenerator.prototype._create_accessor = function(line, header){
var _self = this;
  var re;
  re = /^([+*])\s*([a-zA-Z]\w*)\s*(\\(.*)\\)?$/.exec(line);
  if (!re){
    return null;
  }

  // we should have seen a ctor.
  if (!_self._scope.context.cls){
    warn(header, 'accessor marker w/o class');
    return null;
  }
  var type;
  type = re[1];
  var name;
  name = re[2];
  var ret_type;
  ret_type = re[4];
  var ctx;
  ctx = _self._scope.copy_context(_self._scope.context.cls.method_name(name));
  return new OverridingAccessor(ctx, name, ret_type, type == '+');
};

/**
 * @param {string} line
 * @return {GlobalFunction}
 * @private
 */
SectionGenerator.prototype._create_global_function = function(line){
var _self = this;
  var re;
  re = /^=\s*(\w+)\s*##(\\(.*)\\)?$/.exec(line);
  if (!re){
    return null;
  }
  return new GlobalFunction(_self._scope.copy_context_with_name(re[1]), re[3]);
};

/**
 * @param {string} line
 * @return {MultiLineStr}
 * @private
 */
SectionGenerator.prototype._create_multi_line_str = function(line){
var _self = this;
  var re;
  re = /^'\s*(\w+)$/.exec(line);
  if (!re){
    return null;
  }
  return new MultiLineStr(_self._scope.copy_context_with_name(re[1]));
};

/**
 * @param {string} line
 * @return {GlobalCode}
 * @private
 */
SectionGenerator.prototype._create_global_code = function(line){
var _self = this;
  return line == '' ? new GlobalCode() : null;
};

/**
 * @param {string} line
 * @return {NativeCode}
 * @private
 */
SectionGenerator.prototype._create_native_code = function(line){
var _self = this;
  return line == '~' ? new NativeCode() : null;
};

/**
 * @param {string} line
 * @return {AnonymousScope}
 * @private
 */
SectionGenerator.prototype._create_anonymous_scope = function(line){
var _self = this;
  return line == '{' ? new AnonymousScope() : null;
};

/**
 * @param {string} line
 * @return {Typedef}
 * @private
 */
SectionGenerator.prototype._create_typedef = function(line){
var _self = this;
  var re;
  re = /^\!\s*(\w+)$/.exec(line);
  if (!re){
    return null;
  }
  return new Typedef(_self._scope.copy_context_with_name(re[1]));
};
goog.provide('SectionHead');

/** @constructor */
var SectionHead = function(){
var _self = this;
  /**
   * @type {Array.<IndentBlock>}}
   * @private
   */
  this._blocks = ([]);
};
SectionHead.prototype._classname = 'SectionHead';
/** @type {Array.<IndentBlock>}} */
SectionHead.prototype.blocks;
SectionHead.prototype.__defineGetter__('blocks', function() {
return this._blocks;
});

/** @param {IndentBlock} block */
SectionHead.prototype.add_block = function(block){
var _self = this;
  _self._blocks.push(block);
};

/** @return {number} */
SectionHead.prototype.num_blocks = function(){
var _self = this;
  return _self._blocks.length;
};

/**
 * @param {number} index
 * @return {IndentBlock}
 */
SectionHead.prototype.block = function(index){
var _self = this;
  return _self._blocks[index];
};

/** @return {IndentBlock} */
SectionHead.prototype.last_block = function(){
var _self = this;
  return _self._blocks[_self._blocks.length - 1];
};

/*
do all the work necessary to produce code output.
*/
SectionHead.prototype.transform = function(){
var _self = this;
};
goog.provide('SeparatorLine');

/**
 * @param {InputLine} input
 * @param {LineParser} parser
 * @constructor
 */
var SeparatorLine = function(input, parser){
var _self = this;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
  /**
   * @type {number}
   * @private
   */
  this._indent = (parser.indent);
};
SeparatorLine.prototype._classname = 'SeparatorLine';
/** @type {InputLine} */
SeparatorLine.prototype.input;
SeparatorLine.prototype.__defineGetter__('input', function() {
return this._input;
});
/** @type {number} */
SeparatorLine.prototype.indent;
SeparatorLine.prototype.__defineGetter__('indent', function() {
return this._indent;
});

/** @type {boolean} */
SeparatorLine.prototype.is_continuation;
SeparatorLine.prototype.__defineGetter__('is_continuation', function() {
var _self = this;
  return false;
});

/** @return {LineOutput} */
SeparatorLine.prototype.output = function(){
var _self = this;
  return null;
};
goog.provide('StringSet');
goog.provide('ClassDeps');
goog.provide('create_sorted_list');

/** @constructor */
var StringSet = function(){
var _self = this;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._list = ([]);
  /**
   * @type {Object.<string, boolean>}
   * @private
   */
  this._map = ({});
};
StringSet.prototype._classname = 'StringSet';

/** @return {string} */
StringSet.prototype.toString = function(){
var _self = this;
  return _self._list.join('|');
};

/** @return {Array.<string>} */
StringSet.prototype.list = function(){
var _self = this;
  return _self._list;
};

/** @return {number} */
StringSet.prototype.size = function(){
var _self = this;
  return _self._list.length;
};

/**
 * @param {string} str
 * @return {boolean}
 */
StringSet.prototype.has = function(str){
var _self = this;
  return _self._map[str];
};

/** @param {Array.<string>} strs */
StringSet.prototype.add_all = function(strs){
var _self = this;
  strs.forEach(
  /** @param {string} str */
  function(str){
    _self.add(str);
  });
};

/** @param {string} str */
StringSet.prototype.add = function(str){
var _self = this;
  _self._list.push(str);
  _self._map[str] = true;
};

/**
 * @param {Array.<string>} strs
 * @return {Array.<string>}
 */
StringSet.prototype.filter_out = function(strs){
var _self = this;
  // remove the strings that are in this set.
  return strs.filter(
  /** @param {string} f */
  function(f){
    return !_self._map[f];
  });
};


/*
where -- maps class name to file name where its defined.
depends -- maps file name to array of required class names.
*/
/** @constructor */
var ClassDeps = function(){
var _self = this;
  /**
   * @type {Object.<string, string>}
   * @private
   */
  this._where = ({});
  /**
   * @type {Object.<string, Array.<string>>}
   * @private
   */
  this._depends = ({});
};
ClassDeps.prototype._classname = 'ClassDeps';

/** @return {string} */
ClassDeps.prototype.toString = function(){
var _self = this;
  return Object.keys(/** @type {!Object} */(_self._depends)).map(
  /** @param {string} k */
  function(k){
    return '[' + k + ':' + _self._depends[k].join('|') + ']';
  }).join('');
};

/** @param {Array.<string>} files */
ClassDeps.prototype.load = function(files){
var _self = this;
  files.forEach(
  /** @param {string} file */
  function(file){
    _self._depends[file] = [];
    var tk;
    tk = JSON.parse(_fs.readFileSync(file.replace(/\.js/, '.tk'), 'utf-8'));
    tk['cls'].forEach(
    /** @param {*} cls */
    function(cls){
      _self._where[cls.name] = file;
      if (cls['parent']){
        _self._depends[file].push(cls['parent']);
      }
    });
    // remove self dependencies.
    _self._depends[file] = _self._depends[file].filter(
    /** @param {string} dep */
    function(dep){
      return _self._where[dep] != file;
    });
  });
};

/**
 * @param {string} file
 * @return {boolean}
 */
ClassDeps.prototype.has_deps = function(file){
var _self = this;
  var dep;
  dep = _self._depends[file];
  return !!dep && !!dep.length;
};

/**
 * @param {string} file
 * @param {StringSet} provided_files
 */
ClassDeps.prototype.remove_deps = function(file, provided_files){
var _self = this;
  _self._depends[file] = _self._depends[file].filter(
  /**
   * @param {string} dep
   * @param {number} i
   */
  function(dep, i){
    return !provided_files.has(_self._where[dep]);
  });
};


/**
 * @param {Array.<string>} files
 * @return {Array.<string>}
 */
var create_sorted_list = function(files){
  var deps;
  deps = new ClassDeps();
  deps.load(files);

  // sort the files in inheritance order.
  var all;
  all = files.concat();
  var sorted;
  sorted = new StringSet();
  while (all.length){
    var found;
    found = new StringSet();
    all.forEach(
    /** @param {string} f */
    function(f){
      // remove the dependencies already satisfied.
      deps.remove_deps(f, sorted);

      if (!deps.has_deps(f)){
        found.add(f);
      }
    });

    if (!found.size()){
      // no progress. something's wrong.
      console.log('remaining deps: ' + deps);
      throw 'circular inheritance dependencies';
    }

    sorted.add_all(found.list());

    // remove all the found files.
    all = found.filter_out(all);
  }
  return sorted.list();
};
goog.provide('TypeDecoder');

/**
 * @param {!Package} pkg
 * @param {string} type
 * @constructor
 */
var TypeDecoder = function(pkg, type){
var _self = this;
  /**
   * @type {!Package}
   * @private
   */
  this._pkg = pkg;
  /**
   * @type {string}
   * @private
   */
  this._type = type;
  /**
   * @type {string}
   * @private
   */
  this._decoded = ('');
  _self._process();
};
TypeDecoder.prototype._classname = 'TypeDecoder';

/** @private */
TypeDecoder.prototype._process = function(){
var _self = this;
  _self._decoded = _self._pkg.replace_str(_self._type);
  [
    ['\\bb\\b', 'boolean'],
    ['\\bf\\b', 'function'],
    ['\\bn\\b', 'number'],
    ['\\bs\\b', 'string'],
    ['\\bA\\b', 'Array'],
    ['\\bF\\b', 'Function'],
    ['\\bO\\b', 'Object']
  ].forEach(
  /** @param {string} re_type */
  function(re_type){
    _self._decoded = _self._decoded.replace(new RegExp(re_type[0], 'g'), re_type[1]);
  });
};

/** @return {string} */
TypeDecoder.prototype.output = function(){
var _self = this;
  return _self._decoded;
};
goog.provide('TypeSet');

/** @constructor */
var TypeSet = function(){
var _self = this;
  /**
   * @type {CallableType}
   * @private
   */
  this._ctor = (null);
  /**
   * @type {Array}
   * @private
   */
  this._classes = ([]);
  /**
   * @type {Array}
   * @private
   */
  this._functs = ([]);
};
TypeSet.prototype._classname = 'TypeSet';

/**
 * @param {string} name
 * @return {CallableType}
 */
TypeSet.prototype.add_ctor = function(name){
var _self = this;
  _self._ctor = new CallableType(name);
  _self._classes.push(_self._ctor);
  return _self._ctor;
};

/**
 * @param {string} name
 * @return {CallableType}
 */
TypeSet.prototype.add_funct = function(name){
var _self = this;
  var fn;
  fn = new CallableType(name);
  _self._functs.push(fn);
  return fn;
};

/** @return {CallableType} */
TypeSet.prototype.get_current_ctor = function(){
var _self = this;
  return _self._ctor;
};

/** @param {string} parent_name */
TypeSet.prototype.set_parent = function(parent_name){
var _self = this;
  if (!_self._ctor){
    throw 'set parent called w/o ctor.';
  }
  _self._ctor.set_parent(parent_name);
};

/** @return {Object} */
TypeSet.prototype.extract = function(){
var _self = this;
  var obj;
  obj = {};
  if (_self._classes){
    obj['cls'] = _self._classes.map(
    /** @param {TypeSet} cls */
    function(cls){
      return cls.extract();
    });
  }
  if (_self._functs){
    obj['fns'] = _self._functs.map(
    /** @param {CallableType} fn */
    function(fn){
      return fn.extract();
    });
  }
  return obj;
};
goog.provide('arr_flatten');
goog.provide('check');
goog.provide('whitespaces');
goog.provide('obj_stringify');
goog.provide('doc_lines');

/** @param {string|Array} lines */
var arr_flatten = function(lines){
  if (typeof(lines) == 'string'){
    return [lines];
  }
  if (lines instanceof LineOutput || lines instanceof BlockOutput){
    lines = lines.output;
  }
  console.assert(
    lines instanceof Array,
    'input to arr_flatten should be a string or an array'
  );
  return lines.reduce(
  /**
   * @param {Array} arr
   * @param {string|Array} line
   */
  function(arr, line){
    return arr.concat(arr_flatten(line));
  }, []);
};

/** @param {Object} obj */
var check = function(obj){
  console.log(_util.inspect(obj, false, null));
};

/**
 * @param {number} num
 * @return {string}
 */
var whitespaces = function(num){
  var s;
  s = '';
  var i;
  i = 0;
  for (; i < num; i++){
    s += ' ';
  }
  return s;
};

/**
 * @param {Object} obj
 * @param {boolean=} compact
 * @param {string=} name
 * @param {number=} opt_level
 * @return {string}
 */
var obj_stringify = function(obj, compact, name, opt_level){
  var level = opt_level === undefined ? (0) : opt_level;
  var start_str;
  start_str = whitespaces(level * 2);
  if (name){
    start_str += name + ':';
  }

  if (obj instanceof Array){
    var children;
    children = obj.map(
    /** @param {Object} c */
    function(c){
      return obj_stringify(c, compact, undefined, level + 1);
    }).filter(
    /** @param {string} c */
    function(c){
      return !!c;
    });
    if (children.length){
      return start_str + '[\n' + children.join('') + whitespaces(level * 2) + ']\n';
    }
    else{
      return compact ? '' : start_str + '[]\n';
    }
  }
  else if (obj instanceof Object){
    var keys;
    keys = [];
    var key;
    for (key in obj){
      keys.push(key);
    }
    var children;
    children = keys.map(
    /** @param {string} k */
    function(k){
      return obj_stringify(obj[k], compact, k, level + 1);
    }).filter(
    /** @param {string} c */
    function(c){
      return !!c;
    });
    if (children.length){
      return start_str + '{\n' + children.join('') + whitespaces(level * 2) + '}\n';
    }
    else{
      return compact ? '' : start_str + '{}\n';
    }
  }
  else{
    return start_str + obj + '\n';
  }
};

/** @param {Array.<string>} annotations */
var doc_lines = function(annotations){
  var alist;
  alist = arr_flatten(annotations);
  if (alist.length == 0){
    return [];
  }
  if (alist.length == 1){
    return ['/** ' + alist[0] + ' */'];
  }
  return [
    '/**',
    alist.map(
    /** @param {string} annotation */
    function(annotation){
      return ' * ' + annotation;
    }),
    ' */'
  ];
};
goog.provide('parser.Result');

/*
Use PEGJS syntax to create a TokenList.
Container and interface of the TokenList to the rest of the converter.
*/

/**
 * @param {parser.TokenList} tokens
 * @param {!Array.<!InputLine>} input
 * @constructor
 */
parser.Result = function(tokens, input){
var _self = this;
  /**
   * @type {parser.TokenList}
   * @private
   */
  this._tokens = tokens;
  /**
   * @type {!Array.<!InputLine>}
   * @private
   */
  this._input = input;
};
parser.Result.prototype._classname = 'parser.Result';
/** @type {parser.TokenList} */
parser.Result.prototype.tokens;
parser.Result.prototype.__defineGetter__('tokens', function() {
return this._tokens;
});

/** @type {Array.<parser.BlockMarker|string>} */
parser.Result.prototype.code;
parser.Result.prototype.__defineGetter__('code', function() {
var _self = this;
  return _self._tokens.list;
});

/** @type {Array.<string>} */
parser.Result.prototype.prev_lines;
parser.Result.prototype.__defineGetter__('prev_lines', function() {
var _self = this;
  return _self._tokens.prev_lines;
});

/** @type {Array.<string>} */
parser.Result.prototype.next_lines;
parser.Result.prototype.__defineGetter__('next_lines', function() {
var _self = this;
  return _self._tokens.next_lines;
});

/** @type {Array.<string>} */
parser.Result.prototype.tail_comment;
parser.Result.prototype.__defineGetter__('tail_comment', function() {
var _self = this;
  return _self._tokens.next_lines;
});

/** @return {Array.<string>} */
parser.Result.prototype.rendered = function(){
var _self = this;
  var lines;
  lines = [];
  _self._tokens.prev_lines.map(
  /** @param {parser.TokenList|string} line */
  function(line){
    lines.push(line.toString());
  });
  var code_line;
  code_line = _self._tokens.toString();
  if (code_line){
    lines.push(code_line);
  }
  _self._tokens.next_lines.map(
  /** @param {parser.TokenList|string} line */
  function(line){
    lines.push(line.toString());
  });
  return lines;
};
goog.provide('parser.Target');

/*
Wrapper for the PEGJS's parse method.
Specific for a particular target (i.e. rule).
*/

  var _parser;
  _parser = require('syntax');

/**
 * @param {string} rule
 * @constructor
 */
parser.Target = function(rule){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._rule = rule;
};
parser.Target.prototype._classname = 'parser.Target';

/**
 * @param {!Array.<InputLine>|string} input
 * @param {LineTransformer=} opt_xformer
 * @param {boolean=} show_error_line
 * @return {?parser.Result}
 */
parser.Target.prototype.run = function(input, opt_xformer, show_error_line){
var _self = this;
  /**
   * @type {LineTransformer}
   * @private
   */
  this._xformer = opt_xformer === undefined ? (null) : opt_xformer;
  if (!(input instanceof Array)){
    input = [new InputLine(input, 0)];
  }

  var lines;
  lines = input.map(
  /** @param {InputLine} input */
  function(input){
    return input.line;
  }).join('\n');
  try{
    var result;
    result = _parser.parse(lines, _self._rule);
  }
  catch (e){
    if (show_error_line){
      // TODO: make this display multi-line right.
      console.error('[FAIL] error for ' + _self._rule);
      console.error('I: ' + lines);
      var sp;
      sp = '   ';
      var i;
      i = 0;
      for (; i < e.offset; i++){
        sp += ' ';
      }
      console.error(sp + '^');
      console.error('E: ' + e);
    }
    return null;
  }
  var b;
  b = new parser.TokenListBuilder(result);
  b.xformer = _self._xformer;
  return b.result(input);
};
goog.provide('parser.BlockMarker');
goog.provide('parser.TokenList');
goog.provide('parser.ParamLine');

/**
 * @param {string} type
 * @constructor
 */
parser.BlockMarker = function(type){
var _self = this;
  // one character string.
  // a: array.
  // o: object.
  // p: param list.
  // f: anonymous function.
  /**
   * @type {string}
   * @private
   */
  this._type = type;
};
parser.BlockMarker.prototype._classname = 'parser.BlockMarker';
/** @type {string} */
parser.BlockMarker.prototype.type;
parser.BlockMarker.prototype.__defineGetter__('type', function() {
return this._type;
});

/** @return {string} */
parser.BlockMarker.prototype.toString = function(){
var _self = this;
  return '|#' + _self._type + '|';
};


/**
 * @param {parser.TokenList=} orig
 * @constructor
 */
parser.TokenList = function(orig){
var _self = this;
  /**
   * @type {Array.<parser.BlockMarker|string>}
   * @private
   */
  this._list = (orig ? orig.list : []);
  /**
   * @type {Array.<string>}
   * @private
   */
  this._prev_lines = ([]);
  /**
   * @type {Array.<string>}
   * @private
   */
  this._next_lines = ([]);
  // '' for unknown (or statement).
  // 'c' for current package ref.
  // 'e' for parent call.
  // 'p' for param line.
  // 's' for separator.
  // 't' for type.
  // 'm' for marker.
  /**
   * @type {string}
   * @private
   */
  this._grammar = ('');
  /**
   * @type {Array}
   * @private
   */
  this._params = (null);
};
parser.TokenList.prototype._classname = 'parser.TokenList';
/** @type {Array.<parser.BlockMarker|string>} */
parser.TokenList.prototype.list;
parser.TokenList.prototype.__defineGetter__('list', function() {
return this._list;
});
/** @type {Array.<string>} */
parser.TokenList.prototype.prev_lines;
parser.TokenList.prototype.__defineGetter__('prev_lines', function() {
return this._prev_lines;
});
/** @type {Array.<string>} */
parser.TokenList.prototype.next_lines;
parser.TokenList.prototype.__defineGetter__('next_lines', function() {
return this._next_lines;
});
/** @type {string} */
parser.TokenList.prototype.grammar;
parser.TokenList.prototype.__defineGetter__('grammar', function() {
return this._grammar;
});
parser.TokenList.prototype.__defineSetter__('grammar', function(value) {
this._grammar = value;
});
/** @type {Array} */
parser.TokenList.prototype.params;
parser.TokenList.prototype.__defineGetter__('params', function() {
return this._params;
});
parser.TokenList.prototype.__defineSetter__('params', function(value) {
this._params = value;
});

/** @type {boolean} */
parser.TokenList.prototype.is_empty;
parser.TokenList.prototype.__defineGetter__('is_empty', function() {
var _self = this;
  if (_self._prev_lines.length || _self._next_lines.length){
    return false;
  }
  if (!_self._list.length){
    return true;
  }
  if (_self._list.length >= 2){
    return false;
  }
  return !(_self._list[0] instanceof parser.BlockMarker) && _self._list[0] == '';
});

/**
 * @param {...*} args
 * @return {parser.TokenList}
 */
parser.TokenList.prototype.add = function(args){
var _self = this;
  var i;
  i = 0;
  for (; i < arguments.length; i++){
    var arg;
    arg = arguments[i];

    // Recursive cases.
    if (arg instanceof parser.TokenList){
      arg.list.forEach(
      /** @param {parser.BlockMarker|string} token */
      function(token){
        _self.add(token);
      });
      arg.prev_lines.forEach(
      /** @param {string} l */
      function(l){
        _self._prev_lines.push(l);
      });
      arg.next_lines.forEach(
      /** @param {string} l */
      function(l){
        _self._next_lines.push(l);
      });
      continue;
    }
    if (arg instanceof Array){
      arg.forEach(
      /** @param {Array} token */
      function(token){
        _self.add(token);
      });
      continue;
    }

    // Always append a marker.
    if (arg instanceof parser.BlockMarker){
      _self._list.push(arg);
      continue;
    }

    // Should be a string. Append only if we can't add to the last element.
    var last;
    last = _self._list.length - 1;
    if (!_self._list.length || _self._list[last] instanceof parser.BlockMarker){
      _self._list.push(arg);
      continue;
    }
    _self._list[last] += arg;
  }
  return _self;
};

/**
 * @param {parser.TokenList|string} line
 * @return {parser.TokenList}
 */
parser.TokenList.prototype.prepend = function(line){
var _self = this;
  if (line instanceof parser.TokenList){
    _self._prev_lines = _self._prev_lines.concat(line.prev_lines);
    _self._next_lines = _self._next_lines.concat(line.next_lines);
  }
  _self._prev_lines.push(line.toString());
  return _self;
};

/** @param {parser.TokenList|string} line */
parser.TokenList.prototype.append = function(line){
var _self = this;
  if (line instanceof parser.TokenList){
    _self._prev_lines = _self._prev_lines.concat(line.prev_lines);
    _self._next_lines = _self._next_lines.concat(line.next_lines);
  }
  _self._next_lines.push(line.toString());
  return _self;
};

/** @return {string} */
parser.TokenList.prototype.toString = function(){
var _self = this;
  return _self._list.join('');
};


/**
 * @param {string} name
 * @param {boolean} is_member
 * @param {string} access
 * @param {string} type
 * @param {string} marker
 * @param {parser.TokenList} init
 * @constructor
 * @extends {parser.TokenList}
 */
parser.ParamLine = function(name, is_member, access, type, marker, init){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {boolean}
   * @private
   */
  this._is_member = is_member;
  /**
   * @type {string}
   * @private
   */
  this._access = access;
  /**
   * @type {string}
   * @private
   */
  this._type = type;
  /**
   * @type {string}
   * @private
   */
  this._marker = marker;
  /**
   * @type {parser.TokenList}
   * @private
   */
  this._init = init;
  parser.TokenList.call(this);
};
goog.inherits(parser.ParamLine, parser.TokenList);
parser.ParamLine.prototype._classname = 'parser.ParamLine';
/** @type {string} */
parser.ParamLine.prototype.name;
parser.ParamLine.prototype.__defineGetter__('name', function() {
return this._name;
});
/** @type {boolean} */
parser.ParamLine.prototype.is_member;
parser.ParamLine.prototype.__defineGetter__('is_member', function() {
return this._is_member;
});
/** @type {string} */
parser.ParamLine.prototype.access;
parser.ParamLine.prototype.__defineGetter__('access', function() {
return this._access;
});
/** @type {string} */
parser.ParamLine.prototype.type;
parser.ParamLine.prototype.__defineGetter__('type', function() {
return this._type;
});
/** @type {string} */
parser.ParamLine.prototype.marker;
parser.ParamLine.prototype.__defineGetter__('marker', function() {
return this._marker;
});
/** @type {parser.TokenList} */
parser.ParamLine.prototype.init;
parser.ParamLine.prototype.__defineGetter__('init', function() {
return this._init;
});

/** @return {string} */
parser.ParamLine.prototype.toString = function(){
var _self = this;
  var list;
  list = [
    _self._is_member ? '@' : '',
    _self._name,
    _self._access,
    _self._type,
    _self._marker
  ];
  var init_str;
  init_str = _self._init.toString();
  if (init_str){
    list.push(' ' + init_str);
  }
  return list.join('');
};
goog.provide('parser.TokenListBuilder');
goog.provide('parser.ParamLineBuilder');

/**
 * @param {parser.TokenList|Array|Object|string} parsed
 * @param {LineTransformer=} opt_xformer
 * @constructor
 */
parser.TokenListBuilder = function(parsed, opt_xformer){
var _self = this;
  /**
   * @type {parser.TokenList|Array|Object|string}
   * @private
   */
  this._parsed = parsed;
  /**
   * @type {LineTransformer}
   * @private
   */
  this._xformer = opt_xformer === undefined ? (null) : opt_xformer;
  /**
   * @type {parser.TokenList}
   * @private
   */
  this._tokens = (null);
};
parser.TokenListBuilder.prototype._classname = 'parser.TokenListBuilder';
/** @type {LineTransformer} */
parser.TokenListBuilder.prototype.xformer;
parser.TokenListBuilder.prototype.__defineGetter__('xformer', function() {
return this._xformer;
});
parser.TokenListBuilder.prototype.__defineSetter__('xformer', function(value) {
this._xformer = value;
});

/** @return {parser.TokenList} */
parser.TokenListBuilder.prototype.build = function(){
var _self = this;
  if (!_self._tokens){
    _self._tokens = new parser.TokenList();
    _self._build_rec(_self._parsed);
  }
  return _self._tokens;
};

/**
 * @param {!Array.<InputLine>} input
 * @return {parser.Result}
 */
parser.TokenListBuilder.prototype.result = function(input){
var _self = this;
  _self.build();
  return new parser.Result(_self._tokens, input);
};

/**
 * @param {parser.TokenList|Array|Object|string} data
 * @private
 */
parser.TokenListBuilder.prototype._build_rec = function(data){
var _self = this;
  if (data instanceof parser.TokenList){
    _self._add_tokens(data);
    return;
  }

  if (data instanceof Array){
    _self._add_array(data);
    return;
  }

  if (data instanceof Object){
    _self._add_object(data);
    return;
  }

  // Must be a string.
  if (data){
    _self._tokens.add(data);
  }
};

/**
 * @param {parser.TokenList} data
 * @private
 */
parser.TokenListBuilder.prototype._add_tokens = function(data){
var _self = this;
  _self._tokens.add(data);
};

/**
 * @param {Array} data
 * @private
 */
parser.TokenListBuilder.prototype._add_array = function(data){
var _self = this;
  data.forEach(
  /** @param {parser.TokenList|Array|Object|string} elem */
  function(elem){
    _self._build_rec(elem);
  });
};

/**
 * @param {Object} data
 * @private
 */
parser.TokenListBuilder.prototype._add_object = function(data){
var _self = this;
  if (data.g){
    var p;
    p = data.params;
    switch (data.g){
      case 'c':;
      // Current package ref.
      var str;
      str = p['percents'] + '.' + p.name;
      _self._tokens.add(_self.xformer ? _self.xformer.pkg_ref(str) : str);
      break;

      case 'e':;
      // Parent call.
      _self._tokens.add(_self.xformer ? _self.xformer.parent_call(
        new parser.TokenListBuilder(p.args, _self.xformer).build().toString()
      ) : ['%(', p.args, ')']);
      break;

      case 'm':;
      // Marker.
      _self._tokens.add(new parser.BlockMarker(p.type));
      break;

      case 'p':;
      // Param line.
      var t;
      t = _self._tokens;
      _self._tokens = new parser.ParamLine(
        p.name,
        p.member,
        p.access,
        new parser.ParamLineBuilder(p.type, _self.xformer).build().toString(),
        p.marker,
        new parser.TokenListBuilder(p.init, _self.xformer).build()
      );
      _self._tokens.add(t);
      break;

      case 's':;
      // Separator line.
      _self._tokens.grammar = 's';
      break;

      case 't':;
      // Type literal.
      _self.add_type_object(p);
      break;
    }
  }

  if (data.t){
    _self._tokens.add(new parser.TokenListBuilder(data.t, _self.xformer).build());
  }
  if (data.p){
    _self._tokens.prepend(new parser.TokenListBuilder(data.p, _self.xformer).build());
  }
  if (data.a){
    _self._tokens.append(new parser.TokenListBuilder(data.a, _self.xformer).build());
  }
};

/** @param {Object} params */
parser.TokenListBuilder.prototype.add_type_object = function(params){
var _self = this;
  _self._tokens.add(_self.xformer ? _self.xformer.cast(params.type) : params.tokens);
};


/**
 * @param {parser.TokenList|Array|Object|string} parsed
 * @param {LineTransformer=} xformer
 * @constructor
 * @extends {parser.TokenListBuilder}
 */
parser.ParamLineBuilder = function(parsed, xformer){
var _self = this;
  parser.TokenListBuilder.call(this, parsed, xformer);
};
goog.inherits(parser.ParamLineBuilder, parser.TokenListBuilder);
parser.ParamLineBuilder.prototype._classname = 'parser.ParamLineBuilder';

/** @param {Object} params */
parser.ParamLineBuilder.prototype.add_type_object = function(params){
var _self = this;
  _self._tokens.add(_self.xformer ? _self.xformer.type(params.type) : params.tokens);
};
goog.provide('CodeLine');

  var CODE_PARSER;
  CODE_PARSER = null;

/**
 * @param {!Context} context
 * @param {InputLine} input
 * @param {LineParser} line_parsed
 * @constructor
 * @extends {SectionHead}
 */
var CodeLine = function(context, input, line_parsed){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {InputLine}
   * @private
   */
  this._input = input;
  /**
   * @type {LineParser}
   * @private
   */
  this._line_parsed = line_parsed;
  /**
   * @type {parser.Result}
   * @private
   */
  this._parsed = (null);
  /**
   * @type {!Array.<!CodeLine>}
   * @private
   */
  this._continue_lines = ([]);
  /**
   * @type {Param|boolean}
   * @private
   */
  this._param = (null);
  /**
   * @type {BlockMatcher}
   * @private
   */
  this._matcher = (null);
  SectionHead.call(this);
};
goog.inherits(CodeLine, SectionHead);
CodeLine.prototype._classname = 'CodeLine';
/** @type {InputLine} */
CodeLine.prototype.input;
CodeLine.prototype.__defineGetter__('input', function() {
return this._input;
});
/** @type {!Array.<!CodeLine>} */
CodeLine.prototype.continue_lines;
CodeLine.prototype.__defineGetter__('continue_lines', function() {
return this._continue_lines;
});
CodeLine.prototype.__defineSetter__('continue_lines', function(value) {
this._continue_lines = value;
});
/** @type {Param|boolean} */
CodeLine.prototype.param;
CodeLine.prototype.__defineGetter__('param', function() {
return this._param;
});
CodeLine.prototype.__defineSetter__('param', function(value) {
this._param = value;
});

/** @type {string} */
CodeLine.prototype.str;
CodeLine.prototype.__defineGetter__('str', function() {
var _self = this;
  return _self._input.line;
});

/** @type {number} */
CodeLine.prototype.indent;
CodeLine.prototype.__defineGetter__('indent', function() {
var _self = this;
  return _self._line_parsed.indent;
});

/** @type {boolean} */
CodeLine.prototype.is_continuation;
CodeLine.prototype.__defineGetter__('is_continuation', function() {
var _self = this;
  return _self._line_parsed.is_continuation;
});

/** @type {boolean} */
CodeLine.prototype.is_block_statement;
CodeLine.prototype.__defineGetter__('is_block_statement', function() {
var _self = this;
  return _self._matcher.is_block_statement;
});

/** @type {parser.Result} */
CodeLine.prototype.parsed;
CodeLine.prototype.__defineGetter__('parsed', function() {
var _self = this;
  if (_self.is_continuation){
    warn(_self._input, 'parse requested for cont. line');
  }
  if (!_self._parsed){
    CODE_PARSER = CODE_PARSER || new parser.Target('ParseLine');
    _self._parsed = CODE_PARSER.run(
      [_self._input].concat(_self._continue_lines),
      new LineTransformer(_self._context, _self._input),
      true
    );
  }
  return _self._parsed;
});

CodeLine.prototype.transform = function(){
var _self = this;
  var code;
  code = (_self._param && _self._param !== true && _self._param.value_line) || _self.parsed.code;

  _self._matcher = new BlockMatcher(_self._context, _self._input, code, _self.blocks);
  _self._matcher.transform();
};

/** @return {LineOutput} */
CodeLine.prototype.output = function(){
var _self = this;
  var out;
  out = new LineOutput(_self._input);
  if (_self._param === true){
    return out;
  }

  out.append_lines(_self.parsed.prev_lines.map(
  /** @param {string} line */
  function(line){
    return line + ';';
  }));
  out.append_lines(_self._matcher.first_line());
  _self._matcher.each_fragment(
  /**
   * @param {IndentBlock} block
   * @param {Array.<string>} tail_code
   */
  function(block, tail_code){
    out.append_block(block.output());
    out.append_lines(tail_code);
  });
  if (_self._param){
    _self._param.output_init(out);
  }
  _self.parsed.tail_comment.forEach(
  /** @param {string} comment */
  function(comment){
    out.tail_comment.push(comment);
  });
  return out;
};
goog.provide('CodeSection');

/**
 * @constructor
 * @extends {SectionHead}
 */
var CodeSection = function(){
var _self = this;
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._lines = ([]);
  SectionHead.call(this);
};
goog.inherits(CodeSection, SectionHead);
CodeSection.prototype._classname = 'CodeSection';
/** @type {Array.<InputLine>} */
CodeSection.prototype.lines;
CodeSection.prototype.__defineGetter__('lines', function() {
return this._lines;
});
CodeSection.prototype.__defineSetter__('lines', function(value) {
this._lines = value;
});

/*
abstract method.
*/
/** @param {!Package=} pkg */
CodeSection.prototype.close = function(pkg){
var _self = this;
};

/** @param {TypeSet} types */
CodeSection.prototype.set_type = function(types){
var _self = this;
};
goog.provide('MultiLineStr');

/**
 * @param {!Context} context
 * @constructor
 * @extends {CodeSection}
 */
var MultiLineStr = function(context){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {number}
   * @private
   */
  this._indent = (-1);
  CodeSection.call(this);
};
goog.inherits(MultiLineStr, CodeSection);
MultiLineStr.prototype._classname = 'MultiLineStr';
/** @type {!Context} */
MultiLineStr.prototype.context;
MultiLineStr.prototype.__defineGetter__('context', function() {
return this._context;
});

/*
same number of strings as @.lines.
*/
/** @return {Array.<string>} */
MultiLineStr.prototype.strlines = function(){
var _self = this;
  var result;
  result = [];
  _self.lines.forEach(
  /** @param {InputLine} line */
  function(line){
    if (line.is_blank){
      // empty line is fine.
      result.push('');
      return;
    }
    if (_self._indent < 0){
      _self._indent = line.indent;
    }
    else if (line.indent < _self._indent){
      warn(line, 'inconsistent indentation');
      return;
    }
    result.push(line.line.substr(_self._indent));
  });
  return result;
};

/** @return {Array.<LineOutput>} */
MultiLineStr.prototype.output = function(){
var _self = this;
  var lines;
  lines = _self.strlines();
  return [
    _self._context.name.decl() + ' =',
    lines.map(
    /**
     * @param {string} line
     * @param {number} i
     */
    function(line, i){
      var out;
      out = new LineOutput(_self.lines[i]);
      out.indent = _self._indent;
      out.append_line("'" + line + "\\n'" + (i == lines.length - 1 ? ';' : ' +'));
      return out;
    })
  ];
};
goog.provide('NativeCode');

/**
 * @constructor
 * @extends {CodeSection}
 */
var NativeCode = function(){
var _self = this;
  CodeSection.call(this);
};
goog.inherits(NativeCode, CodeSection);
NativeCode.prototype._classname = 'NativeCode';

/** @return {Array.<LineOutput>} */
NativeCode.prototype.output = function(){
var _self = this;
  return _self.lines.map(
  /** @param {InputLine} line */
  function(line){
    var out;
    out = new LineOutput(line);
    out.append_line(line.trim);
    return out;
  });
};
goog.provide('Runnable');

/**
 * @constructor
 * @extends {CodeSection}
 */
var Runnable = function(){
var _self = this;
  CodeSection.call(this);
};
goog.inherits(Runnable, CodeSection);
Runnable.prototype._classname = 'Runnable';

/** @override */
Runnable.prototype.close = function(pkg){
var _self = this;
  var c;
  c = new CodeScope(new Context(pkg || new Package('')), _self);
  c.process(_self.lines);
};

/** @override */
Runnable.prototype.transform = function(){
var _self = this;
  assert(
    _self.num_blocks() == 1,
    _self.lines[0],
    'Runnable has ' + _self.num_blocks() + ' blocks'
  );
  _self.block(0).transform();
};

/**
 * @param {string} block_suffix
 * @return {Array.<LineOutput>}
 */
Runnable.prototype.output_body = function(block_suffix){
var _self = this;
  var lines;
  lines = [];
  var body_lines;
  body_lines = _self.last_block().output();
  if (block_suffix){
    body_lines.suffix = block_suffix;
  }
  if (!body_lines.is_empty){
    lines.push(body_lines);
  }
  return lines;
};
goog.provide('AnonymousScope');

/**
 * @constructor
 * @extends {Runnable}
 */
var AnonymousScope = function(){
var _self = this;
  Runnable.call(this);
};
goog.inherits(AnonymousScope, Runnable);
AnonymousScope.prototype._classname = 'AnonymousScope';

/** @return {Array} */
AnonymousScope.prototype.output = function(){
var _self = this;
  return ['(function() {', _self.output_body('})();')];
};
goog.provide('Callable');

/**
 * @param {!Context} context
 * @param {string} return_type
 * @constructor
 * @extends {Runnable}
 */
var Callable = function(context, return_type){
var _self = this;
  /**
   * @type {!Context}
   * @private
   */
  this._context = context;
  /**
   * @type {string}
   * @private
   */
  this._return_type = return_type;
  /**
   * @type {ParamSet}
   * @private
   */
  this._params = (null);
  Runnable.call(this);
};
goog.inherits(Callable, Runnable);
Callable.prototype._classname = 'Callable';
/** @type {!Context} */
Callable.prototype.context;
Callable.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {string} */
Callable.prototype.return_type;
Callable.prototype.__defineGetter__('return_type', function() {
return this._return_type;
});
/** @type {ParamSet} */
Callable.prototype.params;
Callable.prototype.__defineGetter__('params', function() {
return this._params;
});
Callable.prototype.__defineSetter__('params', function(value) {
this._params = value;
});

/** @return {string} */
Callable.prototype.name = function(){
var _self = this;
  return _self._context.name.ref();
};

/** @override */
Callable.prototype.close = function(pkg){
var _self = this;
  var c;
  c = new CodeScope(_self._context, _self);
  c.process(_self.lines);
};

/** @override */
Callable.prototype.transform = function(){
var _self = this;
  assert(
    _self.num_blocks() == 1,
    _self.lines[0],
    'callable takes 1 block -- found ' + _self.num_blocks()
  );
  _self._params = new ParamSet(_self._context, _self.block(0));
  _self._params.transform();
  _self._params.set_return_type(_self._return_type);
  _self.block(0).transform();
};

/** @return {string} */
Callable.prototype.output_func = function(){
var _self = this;
  return _self._context.name.decl() + ' = function(' + _self._params.output_params() + '){';
};
goog.provide('GlobalCode');

/**
 * @constructor
 * @extends {Runnable}
 */
var GlobalCode = function(){
var _self = this;
  Runnable.call(this);
};
goog.inherits(GlobalCode, Runnable);
GlobalCode.prototype._classname = 'GlobalCode';

/** @return {Array} */
GlobalCode.prototype.output = function(){
var _self = this;
  return _self.output_body('');
};
goog.provide('Typedef');

/**
 * @param {!Context} context
 * @constructor
 * @extends {MultiLineStr}
 */
var Typedef = function(context){
var _self = this;
  MultiLineStr.call(this, context);
};
goog.inherits(Typedef, MultiLineStr);
Typedef.prototype._classname = 'Typedef';

/** @return {Array.<LineOutput>} */
Typedef.prototype.output = function(){
var _self = this;
  var decoder;
  decoder = new TypeDecoder(_self.context.pkg, _self.strlines().join(''));
  var out;
  out = new LineOutput(_self.lines[0]);
  out.indent = 0;
  out.append_lines([
    doc_lines(['@typedef {' + decoder.output() + '}']),
    _self.context.name.decl() + ';'
  ]);
  return [out];
};
goog.provide('Constructor');

/**
 * @param {!Context} context
 * @param {string?=} opt_parent
 * @constructor
 * @extends {Callable}
 */
var Constructor = function(context, opt_parent){
var _self = this;
  /**
   * @type {string?}
   * @private
   */
  this._parent = opt_parent === undefined ? (null) : opt_parent;
  context.is_ctor = true;
  Callable.call(this, context, '');
  _self._parent = _self._parent ? _self.context.pkg.replace(_self._parent) : '';
};
goog.inherits(Constructor, Callable);
Constructor.prototype._classname = 'Constructor';

/** @return {string} */
Constructor.prototype.parent_name = function(){
var _self = this;
  return /** @type {string} */(_self._parent);
};

/** @override */
Constructor.prototype.transform = function(){
var _self = this;
  assert(_self.num_blocks() == 1, _self.lines[0]);
  _self.params = new ParamSet(_self.context, _self.block(0), true);
  _self.params.transform();
  _self.block(0).transform();
};

/** @return {Array} */
Constructor.prototype.output = function(){
var _self = this;
  var decl;
  decl = _self.params.output_decls();
  decl.push('@constructor');
  var inherit;
  inherit = [];
  if (_self._parent){
    decl.push('@extends {' + _self._parent + '}');
    inherit.push('goog.inherits(' + _self.context.name.ref() + ', ' + _self._parent + ');');
  }
  return [
    doc_lines(decl),
    _self.output_func(),
    'var self = this;',
    _self.output_body('};'),
    inherit,
    [
      _self.context.name.property('_classname').decl(),
      " = '",
      _self.context.name.ref(),
      "';"
    ].join(''),
    _self.context.cls.output_accessors()
  ];
};

/** @override */
Constructor.prototype.set_type = function(types){
var _self = this;
  _self.params.set_argtypes(types.get_current_ctor());
};
goog.provide('GlobalFunction');

/**
 * @param {!Context} context
 * @param {string} return_type
 * @constructor
 * @extends {Callable}
 */
var GlobalFunction = function(context, return_type){
var _self = this;
  Callable.call(this, context, return_type);
};
goog.inherits(GlobalFunction, Callable);
GlobalFunction.prototype._classname = 'GlobalFunction';

/** @return {Array} */
GlobalFunction.prototype.output = function(){
var _self = this;
  return [
    doc_lines(_self.params.output_decls()),
    _self.output_func(),
    _self.output_body('};')
  ];
};

/** @override */
GlobalFunction.prototype.set_type = function(types){
var _self = this;
  _self.params.set_argtypes(types.add_funct(_self.context.name.ref()));
};
goog.provide('Method');

/**
 * @param {!Context} context
 * @param {string} return_type
 * @param {boolean} overriding
 * @constructor
 * @extends {Callable}
 */
var Method = function(context, return_type, overriding){
var _self = this;
  /**
   * @type {boolean}
   * @private
   */
  this._overriding = overriding;
  context.is_method = true;
  Callable.call(this, context, return_type);
};
goog.inherits(Method, Callable);
Method.prototype._classname = 'Method';

/** @return {Array} */
Method.prototype.output = function(){
var _self = this;
  var decls;
  decls = [];
  if (_self._overriding){
    decls = ['@override'];
  }
  else{
    decls = _self.params.output_decls();
  }
  if (/^_/.test(_self.context.name.id)){
    decls.push('@private');
  }
  return [
    doc_lines(decls),
    _self.output_func(),
    'var self = this;',
    _self.output_body('};')
  ];
};

/** @override */
Method.prototype.set_type = function(types){
var _self = this;
  _self.params.set_argtypes(
    types.get_current_ctor().add_method(_self.context.name.id)
  );
};
goog.provide('OverridingAccessor');

/**
 * @param {!Context} context
 * @param {string} name
 * @param {string} return_type
 * @param {boolean} is_getter
 * @constructor
 * @extends {Callable}
 */
var OverridingAccessor = function(context, name, return_type, is_getter){
var _self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {boolean}
   * @private
   */
  this._is_getter = is_getter;
  context.is_method = true;
  Callable.call(this, context, return_type);
};
goog.inherits(OverridingAccessor, Callable);
OverridingAccessor.prototype._classname = 'OverridingAccessor';

/** @return {Array} */
OverridingAccessor.prototype.output = function(){
var _self = this;
  var member;
  member = _self.context.cls.member(_self._name);
  // TODO: error if there is member and we have param or return type specified to the
  // accessor.
  // TODO: error if there is no member, but there are both getter and setter, and their param
  // and return type do not match. also error if the setter takes more than one param.
  if (!member){
    // accessor with no corresponding member. use the given param and return types.
    member = _self.context.cls.add_member(
      _self._name,
      new TypeDecoder(_self.context.pkg, _self.return_type),
      '&',
      true
    );
  }
  var class_name;
  class_name = _self.context.cls.name();
  return [
    member.output_decl(class_name),
    member.output_accessor(class_name, _self._is_getter, [
      'var self = this;',
      _self.output_body('')
    ], _self.params)
  ];
};


  // TODO: @enum
  var ExecModes;
  ExecModes = {
    COMPILE: 0,
    SORT: 1,
    ARGTYPE: 2
  };

  // TODO: @type {ExecModes}
  var mode;
  mode = ExecModes.COMPILE;

  var ReplyModes;
  ReplyModes = {
    MSG: 0,
    STDOUT: 1
  };

  var reply;
  reply = ReplyModes.MSG;


  // extract only the input / output file names.
  var basedir;
  basedir = '';
  var inout_filenames;
  inout_filenames = process.argv.filter(
  /**
   * @param {string} arg
   * @param {number} i
   */
  function(arg, i){
    // argv[0] is node binary and argv[1] is the executing js.
    if (i < 2){
      return false;
    }
    var option_re;
    option_re = /--(\w+)(=(.*))?/.exec(arg);
    if (!option_re){
      return true;
    }
    var opt_name;
    opt_name = option_re[1];
    var opt_param;
    opt_param = option_re[3];
    if (opt_name == 'basedir'){
      basedir = opt_param;
    }
    else if (opt_name == 'sort'){
      mode = ExecModes.SORT;
    }
    else if (opt_name == 'argtypes'){
      mode = ExecModes.ARGTYPE;
    }
    else if (opt_name == 'stdout'){
      reply = ReplyModes.STDOUT;
    }
    else{
      throw 'unknown command option: ' + opt_name;
    }
    return false;
  });

  switch (mode){
    case ExecModes.COMPILE:;
    compile_files(basedir, inout_filenames);
    break;

    case ExecModes.SORT:;
    var list;
    list = create_sorted_list(inout_filenames);
    switch (reply){
      case ReplyModes.MSG:;
      process.send(list);
      break;

      case ReplyModes.STDOUT:;
      console.log(list.join(' '));
      break;
    }
    break;

    case ExecModes.ARGTYPE:;
    create_argtypes(basedir, inout_filenames);
    break;
  }
  process.exit(0);
