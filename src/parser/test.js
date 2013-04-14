var _fs = require('fs');


var TestFile = function(filename) {
  console.log('=== ' + filename);
  this.expect_error = false;
  this.expected = [];
  this.rule_name = 'start';
  this.input_lines = _fs.readFileSync(filename, 'utf8').split('\n');
};

TestFile.prototype.run = function() {
  this.input_lines.forEach(function(line) {
    if (!line || /^---/.test(line)) {
      this.run_if_ready();
      return;
    }

    var re = /^\:(\w+)\s*$/.exec(line);
    if (re) {
      // New rule name set up.
      this.run_if_ready();
      this.expect_error = false;
      this.rule_name = re[1];
      return;
    }

    if (/^:\!\s*$/.test(line)) {
      // From now on, expect error.
      this.run_if_ready();
      this.expect_error = true;
      return;
    }
    
    re = /^\s+(.*)/.exec(line);
    if (re) {
      // Need to set the expected before calling run_if_ready so the expected
      // value gets used for the current test.
      this.expected.push(re[1]);
      return;
    }

    this.run_if_ready();
    this.input = line;
  }, this);
  this.run_if_ready();
};

TestFile.prototype.run_if_ready = function() {
  if (!this.input) {
    return;
  }
  var expected = this.expected.length ? this.expected.join(' /|/ ') : this.input;
  this.run_test(this.input, expected);
  this.input = '';
  this.expected = [];
};

TestFile.prototype.run_test = function(line, expected) {
  var target = new parser.Target(this.rule_name);
  lines = line.replace(/\s*\/\|\/\s*/, '\n')
  try {
    var result = target.run(lines)
  } catch(e) {
    if (!this.expect_error) {
      console.error('[FAIL] error for ' + this.rule_name);
      e.context_lines.forEach(function(line, i) {
        console.error((i == 0 ? 'I: ' : '   ') + line)
      });
      console.error('E: ' + e.message)
      process.exit(-1);
    }
    return;
  }
  var result_str = result.rendered().join(' /|/ ');
  if (this.expect_error) {
    console.error('[FAIL] error expected');
    console.error('I: ' + line);
    console.error('O: ' + result_str);
    console.error(result);
    process.exit(-1);
  } else if (result_str != expected) {
    console.error('[FAIL]');
    console.error('I: ' + line);
    console.error('T: ' + expected);
    console.error('O: ' + result_str);
    console.error(result);
    process.exit(-1);
  }
};


var ConvertFile = function(filename) {
  console.log('=== ' + filename);
  this.input_lines = _fs.readFileSync(filename, 'utf8').split('\n');
};

ConvertFile.prototype.run = function() {
  this.input_lines.forEach(function(line) {
    var re = /^\s+(.*)/.exec(line);
    if (re) {
      this.parse(re[1]);
    } else {
      console.log(' | ' + line);
    }
  }, this);
};

ConvertFile.prototype.parse = function(line) {
  try {
    var target = new parser.Target('BlockLine');
    console.log('O|  ' + target.run(line).rendered().join(' /|/ '));
  } catch (e) {
    console.log('X|  ' + line);
    var sp = '   ';
    for (var i = 0; i < e.offset; i++) {
      sp += ' ';
    }
    console.log(sp + '^');
    console.log('   ' + e);
  }
};


var mode = '';
process.argv.forEach(function(arg, i) {
  // First two arguments are node and executing script name.
  if (i < 2) { return; }

  // The third parameter decides execution mode.
  if (i == 2) {
    switch(arg) {
      case '-p': mode = 'p'; break;
      case '-t': mode = 't'; break;
      default:
        console.log('unknown exec mode: ' + arg);
        process.exit(-1);
    }
    return;
  }

  switch(mode) {
    case 'p': new ConvertFile(arg).run(); break;
    case 't': new TestFile(arg).run(); break;
  }
});
