////////////////////////////////////////////////////////////
// JavaScript

var JSON;
var global = {};

/**
 * @param {*} value
 * @return {string}
 */
JSON.stringify = function(value) {};


////////////////////////////////////////////////////////////
// node.js.

/** @constructor */
var Stream = function() {};

/**
 * @param {string} type
 * @param {*} cb
 */
Stream.prototype.on = function(type, cb) {};

/** @constructor */
var ChildProcess = function() {};

/**
 * @param {string} type
 * @param {*} cb
 */
ChildProcess.prototype.on = function(type, cb) {};

/** @type {Stream} */
ChildProcess.prototype.stdout;

var _cp;

/**
 * @param {string} modulePath
 * @param {Array.<string>=} opt_args
 * @param {{cws:(string|undefined), env:(Object|undefined),
 *          encoding:(string|undefined)}=} opt_options
 * @return {ChildProcess}
 */
_cp.fork = function(modulePath, opt_args, opt_options) {};

var _eco;

/**
 * @param {string} template
 * @param {Object} params
 */
_eco.render = function(template, params) {};

var _fs = {};

/** @constructor */
_fs.Stats = function() {};

/**
 * @return {boolean}
 */
_fs.Stats.prototype.isDirectory = function() {};

/** @type{Date} */
_fs.Stats.prototype.mtime;

/**
 * @param {string} path
 * @return {boolean}
 */
_fs.existsSync = function(path) {};

/**
 * @param {string} path
 * @return {Array.<string>}
 */
_fs.readdirSync = function(path) {};

/**
 * @param {string} filename
 * @param {string=} opt_encoding
 * @param {Function=} opt_callback
 */
_fs.readFile = function(filename, opt_encoding, opt_callback) {};

/**
 * @param {string} filename
 * @param {string=} opt_encoding
 * @return {string}
 */
_fs.readFileSync = function(filename, opt_encoding) {};

/**
 * @param {string} filename
 * @return {_fs.Stats}
 */
_fs.statSync = function(filename) {};

/**
 * @param {string} filename
 * @param {string} data
 * @param {string=} opt_encoding
 * @param {Function=} opt_callback
 */
_fs.writeFile = function(filename, data, opt_encoding, opt_callback) {};

/**
 * @param {string} filename
 * @param {string} data
 * @param {string=} opt_encoding
 * @return {string}
 */
_fs.writeFileSync = function(filename, data, opt_encoding) {};

var _http = {};

/**
 * @param {*} listener
 * @return {_net.Server}
 */
_http.createServer = function(listener) {};

/** @constructor */
_http.ServerRequest = function() {};

/** @type {string} */
_http.ServerRequest.prototype.url;

/** @type {string} */
_http.ServerRequest.prototype.method;

/**
 * @param {string} evnt
 * @param {function(string)} callback
 */
_http.ServerRequest.prototype.on = function(evnt, callback) {};

/**
 * @param {string} evnt
 * @param {function()} callback
 */
_http.ServerRequest.prototype.once = function(evnt, callback) {};

/**
 * @param {string} encoding
 */
_http.ServerRequest.prototype.setEncoding = function(encoding) {};

/** @constructor */
_http.ServerResponse = function() {};

/**
 * @param {string=} opt_data
 */
_http.ServerResponse.prototype.end = function(opt_data) {};

/**
 * @param {number} statusCode
 * @param {Object=} opt_params
 */
_http.ServerResponse.prototype.writeHead = function(statusCode, opt_params) {};

/**
 * @param {string} data
 * @param {string=} opt_encoding
 */
_http.ServerResponse.prototype.write = function(data, opt_encoding) {};

/** @type {number} */
_http.ServerResponse.prototype.statusCode;

var _net = {};

/** @constructor */
_net.Server = function() {};

/**
 * @param {number} port
 * @param {string} host
 */
_net.Server.prototype.listen = function(port, host) {};

var _path = {};

/**
 * @param {string} filename
 * @return {string}
 */
_path.basename = function(filename) {};

/**
 * @param {string} filename
 * @return {string}
 */
_path.extname = function(filename) {};

var _url;

var _util = {};

/**
 * @param {Object} object
 * @param {boolean=} opt_showHidden
 * @param {?number=} opt_depth
 * @param {boolean=} opt_colors
 */
_util.inspect = function(object, opt_showHidden, opt_depth, opt_colors) {};

var process = {};

/** @type {Array.<string>} */
process.argv = [];

/**
 * @param {number} exit_code
 */
process.exit = function(exit_code) {};

var console;
var require;

////////////////////////////////////////////////////////////
// wacom.

/** @constructor */
var WacomPlugin = function() {};

/** @type {string} */
WacomPlugin.prototype.version;

/** @constructor */
var WacomPenAPI = function() {};

/** @type {string} */
WacomPenAPI.prototype.version;

/** @type {string} */
WacomPenAPI.prototype.tabletModel;

/** @type {boolean} */
WacomPenAPI.prototype.isWacom;

/** @type {number} */
WacomPenAPI.prototype.pointerType;

/** @type {boolean} */
WacomPenAPI.prototype.isEraser;

/** @type {number} */
WacomPenAPI.prototype.pressure;

/** @type {number} */
WacomPenAPI.prototype.posX;
/** @type {number} */
WacomPenAPI.prototype.posY;

/** @type {number} */
WacomPenAPI.prototype.sysX;
/** @type {number} */
WacomPenAPI.prototype.sysY;

/** @type {number} */
WacomPenAPI.prototype.tabX;
/** @type {number} */
WacomPenAPI.prototype.tabY;

/** @type {number} */
WacomPenAPI.prototype.tiltX;
/** @type {number} */
WacomPenAPI.prototype.tiltY;
