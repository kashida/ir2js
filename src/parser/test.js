var _fs = require('fs');
var _parser = require('syntax');


global.BlockMarker = function(type) {
  // one character string.
  // a: array.
  // o: object.
  // p: param list.
  // f: anonymous function.
  this.type = type;
};

BlockMarker.prototype.toString = function() {
  return '|#' + this.type + '|';
};

var TokenList = function() {
  // Strings and markers.
  this.list = [];

  this.prev_lines = [];
  this.next_lines = [];
};

TokenList.prototype.add = function() {
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];

    // Recursive cases.
    if (arg instanceof TokenList) {
      arg.list.forEach(function(token) {
        this.add(token);
      }, this);
      arg.prev_lines.forEach(function(l) {
        this.prev_lines.push(l);
      }, this);
      arg.next_lines.forEach(function(l) {
        this.next_lines.push(l);
      }, this);
      continue;
    }
    if (arg instanceof Array) {
      arg.forEach(function(token) {
        this.add(token);
      }, this);
      continue;
    }

    // Always append a marker.
    if (arg instanceof BlockMarker) {
      this.list.push(arg);
      continue;
    }

    // Should be a string. Append only if we can't add to the last element.
    var last = this.list.length - 1
    if (!this.list.length || this.list[last] instanceof BlockMarker) {
      this.list.push(arg);
      continue;
    }
    this.list[last] += arg;
  }
  return this;
};

TokenList.prototype.prepend = function(line) {
  if (line instanceof TokenList) {
    this.prev_lines = this.prev_lines.concat(line.prev_lines);
    this.next_lines = this.next_lines.concat(line.next_lines);
  }
  this.prev_lines.push(line.toString());
  return this;
}

TokenList.prototype.append = function(line) {
  if (line instanceof TokenList) {
    this.prev_lines = this.prev_lines.concat(line.prev_lines);
    this.next_lines = this.next_lines.concat(line.next_lines);
  }
  this.next_lines.push(line.toString());
  return this;
}

TokenList.prototype.toString = function() {
  return this.list.join('');
};

var TypedTokenList = function(type, list) {
  TokenList.call(this);
  this.type = type;
  this.list = list.list;
};
TypedTokenList.prototype = Object.create(TokenList.prototype);

var ParamLine = function(name, is_member, access, type, marker, init) {
  TokenList.call(this);
  this.name = name;
  this.is_member = is_member;
  this.access = access;
  this.type = type;
  this.marker = marker;
  this.init = init;
};
ParamLine.prototype = Object.create(TokenList.prototype);

ParamLine.prototype.toString = function() {
  var list = [
    this.is_member ? '@' : '',
    this.name,
    this.access,
    '\\',
    this.type,
    '\\',
    this.marker];
  var init_str = this.init.toString();
  if (init_str) {
    list.push(' ' + init_str);
  }
  return list.join('');
};

var SeparatorLine = function() {
  TokenList.call(this);
};
SeparatorLine.prototype = Object.create(TokenList.prototype);

SeparatorLine.prototype.toString = function() { return '--'; }

var LineParser = function() {
  this.result = null;
};

LineParser.prototype.parse = function(line, rule) {
  this.result = _parser.parse(line, rule);
  if (!(this.result instanceof TokenList)) {
    this.result = this.make_token(this.result);
  }
};

LineParser.prototype.rendered = function() {
  var lines = [];
  this.result.prev_lines.map(function(line) {
    p=lines.push(line.toString());
  });
  var code_line = this.result.toString();
  if (code_line) { lines.push(code_line); }
  this.result.next_lines.map(function(line) {
    p=lines.push(line.toString());
  });
  return lines;
};


LineParser.prototype.make_token = function(token) {
  var tl = new TokenList();
  tl.add(token);
  return tl;
};

LineParser.prototype.make_typed_token = function(type, token) {
  return new TypedTokenList(type, token);
};

LineParser.prototype.make_marker = function(type) {
  var tl = new TokenList();
  tl.add(new global.BlockMarker(type));
  return tl;
};

LineParser.prototype.make_param_line =
    function(name, is_member, access, type, marker, init) {
  return new ParamLine(name, is_member, access, type, marker, init);
};

LineParser.prototype.make_separator_line = function() {
  return new SeparatorLine();
};

LineParser.prototype.combine_tokens = function() {
  var tl = new TokenList();
  for(var i = 0; i < arguments.length; i++) {
    tl.add(arguments[i]);
  }
  return tl;
};



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

global.line_parser;
TestFile.prototype.run_test = function(line, expected) {
  try {
    line_parser = new LineParser();
    line_parser.parse(line.replace(/\s*\/\|\/\s*/, '\n'), this.rule_name);
    var result_str = line_parser.rendered().join(' /|/ ');
    if (this.expect_error) {
      console.error('[FAIL] error expected');
      console.error('I: ' + line);
      console.error('O: ' + result_str);
      console.error(line_parser);
      process.exit(-1);
    } else if (result_str != expected) {
      console.error('[FAIL]');
      console.error('I: ' + line);
      console.error('T: ' + expected);
      console.error('O: ' + result_str);
      console.error(line_parser);
      process.exit(-1);
    }
  } catch (e) {
    if (!this.expect_error) {
      console.error('[FAIL] error');
      console.error('I: ' + line);
      var sp = '   ';
      for (var i = 0; i < e.offset; i++) {
        sp += ' ';
      }
      console.error(sp + '^');
      console.error('E: ' + e);
      process.exit(-1);
    }
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
    line_parser = new LineParser();
    line_parser.parse(line, 'BlockLine');
    console.log('O|  ' + line_parser.rendered().join(' /|/ '));
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
