  var _fs;
  _fs = require('fs');
  var _ir2js;
  _ir2js = require('ir2js');

var mergeToFile = /**
 * @param {string} base_dir
 * @param {Array.<string>} in_files
 * @param {string} out_file
 */
function(base_dir, in_files, out_file) {
  var out;
  out = _fs.openSync(out_file, 'w');

  var pkgs;
  pkgs = _ir2js.createPackageList(base_dir, in_files);
  _fs.writeSync(out, pkgs.join('\n'), null);
  _fs.writeSync(out, '\n\n', null);

  _ir2js.createSortedList(in_files).forEach(
  /** @param {string} file */
  function(file) {
    _fs.writeSync(out, _fs.readFileSync(file, 'utf8'), null);
  });

  _fs.closeSync(out);
};

  // TODO: @enum
  var ExecModes;
  ExecModes = {
    'COMPILE': 0,
    'SORT': 1,
    'ARGTYPE': 2,
    'PKGLIST': 3,
    'MERGE': 4
  };

  // TODO: @type {ExecModes}
  var mode;
  mode = ExecModes.COMPILE;

  var ReplyModes;
  ReplyModes = {
    'MSG': 0,
    'STDOUT': 1
  };

  var reply;
  reply = ReplyModes.MSG;


  // extract only the input / output file names.
  var base_dir;
  base_dir = '';
  var out_dir;
  out_dir = '';
  var out_file;
  out_file = '';
  var input_files;
  input_files = process.argv.filter(
  /**
   * @param {string} arg
   * @param {number} i
   */
  function(arg, i) {
    // argv[0] is node binary and argv[1] is the executing js.
    if (i < 2) {
      return false;
    }
    var option_re;
    option_re = /--(\w+)(=(.*))?/.exec(arg);
    if (!option_re) {
      return true;
    }
    var opt_name;
    opt_name = option_re[1];
    var opt_param;
    opt_param = option_re[3];
    if (opt_name == 'basedir') {
      base_dir = opt_param;
    }
    else if (opt_name == 'outdir') {
      out_dir = opt_param;
    }
    else if (opt_name == 'outfile') {
      out_file = opt_param;
    }
    else if (opt_name == 'sort') {
      mode = ExecModes.SORT;
    }
    else if (opt_name == 'argtypes') {
      mode = ExecModes.ARGTYPE;
    }
    else if (opt_name == 'pkglist') {
      mode = ExecModes.PKGLIST;
    }
    else if (opt_name == 'merge') {
      mode = ExecModes.MERGE;
    }
    else if (opt_name == 'stdout') {
      reply = ReplyModes.STDOUT;
    }
    else {
      throw 'unknown command option: ' + opt_name;
    }
    return false;
  });

  switch (mode) {
    case ExecModes.COMPILE:;
    _ir2js.compileFiles(base_dir, input_files, out_dir);
    break;

    case ExecModes.SORT:;
    var list;
    list = _ir2js.createSortedList(input_files);
    switch (reply) {
      case ReplyModes.MSG:;
      process.send(list);
      break;

      case ReplyModes.STDOUT:;
      console.log(list.join(' '));
      break;
    }
    break;

    case ExecModes.ARGTYPE:;
    _ir2js.createArgTypes(base_dir, input_files);
    break;

    case ExecModes.PKGLIST:;
    var pkgs;
    pkgs = _ir2js.createPackageList(base_dir, input_files);
    console.log(pkgs.join('\n'));
    break;

    case ExecModes.MERGE:;
    mergeToFile(base_dir, input_files, out_file);
    break;
  }
  process.exit(0);
