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

  var argv;
  argv = (
    require('optimist').
    // Operation modes.
    boolean('sort').
    boolean('pkglist').
    boolean('merge').
    // Input and output.
    string('basedir').
    string('outfile').
    string('outdir').
    argv
  );

  var base_dir;
  base_dir = argv.basedir;
  var input_files;
  input_files = argv._;
  if (argv.sort) {
    var list;
    list = _ir2js.createSortedList(input_files);
    console.log(list.join(' '));
  }
  else if (argv.pkglist) {
    var pkgs;
    pkgs = _ir2js.createPackageList(base_dir, input_files);
    console.log(pkgs.join('\n'));
  }
  else if (argv.merge) {
    mergeToFile(base_dir, input_files, argv.outfile);
  }
  else {
    // Compile mode.
    try {
      _ir2js.compileFiles(base_dir, input_files, argv.outdir);
    }
    catch (e) {
      console.log(e);
      process.exit(-1);
    }
  }
  process.exit(0);
