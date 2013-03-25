var context = {};
var output = {};
var parser = {};
var section = {};
var _fs = require('fs');
var _path = require('path');
var _util = require('util');
/**
 * @param {string} basedir
 * @param {Array.<string>} files
 */
var create_argtypes = function(basedir, files) {
  var output;
  output = [];
  files.forEach(
  /** @param {string} file */
  function(file) {
    var tk;
    tk = JSON.parse(_fs.readFileSync(file.replace(/\.js/, '.tk'), 'utf-8'));
    tk['cls'].forEach(
    /** @param {*} cls */
    function(cls) {
      output.push(cls.name + '._argtypes = [' + cls['args'].join(', ') + '];');
      cls.methods.forEach(
      /** @param {*} method */
      function(method) {
        output.push(cls.name + '.prototype.' + method.name + '._argtypes = [' + method['args'].join(', ') + '];');
      });
    });
    tk['fns'].forEach(
    /** @param {*} fn */
    function(fn) {
      output.push(fn.name + '._argtypes = [' + fn['args'].join(', ') + '];');
    });
  });
  _fs.writeFileSync(basedir + '/_argtypes.js', output.join('\n'), 'utf-8');
};
/*
Match markers and blocks.
*/

/**
 * @param {!context.Context} context
 * @param {InputLine} input
 * @param {Array.<parser.BlockMarker|string>} code
 * @param {Array.<IndentBlock>} blocks
 * @constructor
 */
var BlockMatcher = function(context, input, code, blocks) {
  var self = this;
  /**
   * @type {!context.Context}
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

BlockMatcher.prototype.transform = function() {
  var self = this;
  if (self._match_blocks()) {
    self._transform_blocks();
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
BlockMatcher.prototype._match_blocks = function() {
  var self = this;
  var code;
  code = self._code;
  var idx;
  idx = 1;
  if (self._code[0] instanceof parser.BlockMarker) {
    idx = 0;
    self._starts_with_marker = true;
  }

  while (idx < code.length) {
    var param;
    param = null;
    var elem;
    elem = self._code[idx];
    if (elem instanceof parser.BlockMarker && elem.type == 'f') {
      var sub_context;
      sub_context = self._context.clone();
      sub_context.is_file_scope = false;
      param = new ParamSet(sub_context, self._blocks[self._marker_indexes.length]);
    }

    self._marker_indexes.push(idx);
    self._params.push(param);

    idx += 2;
  }

  if (self._marker_indexes.length < self._blocks.length) {
    // One extra block is allowed.
    self._marker_indexes.push(-1);
    self._is_block_statement = true;
  }

  if (self._marker_indexes.length != self._blocks.length) {
    warn(self._input, '# blocks does not match #markers.');
    return false;
  }
  return true;
};

/** @private */
BlockMatcher.prototype._transform_blocks = function() {
  var self = this;
  self._blocks.forEach(
  /**
   * @param {IndentBlock} block
   * @param {number} i
   */
  function(block, i) {
    // transform the blocks.
    if (self._params[i]) {
      self._params[i].transform();
    }
    var mi;
    mi = self._marker_indexes[i];
    block.transform(mi < 0 ? BlockType.BLOCK : {
      f: BlockType.BLOCK,
      o: BlockType.OBJ,
      a: BlockType.ARRAY,
      p: BlockType.PARAMS,
      '*': BlockType.MULT,
      '+': BlockType.ADD,
      '&&': BlockType.LOG_AND,
      '||': BlockType.LOG_OR
    }[self._code[mi].type]);
  });
};

/** @return {Array.<string>} */
BlockMatcher.prototype.first_line = function() {
  var self = this;
  // there should be at least one fragment.
  return self._compose_line(self._starts_with_marker ? '' : (
    /** @type {string} */(self._code.length ? self._code[0] : '')
  ), 0);
};

/** @param {function(IndentBlock, Array.<string>)} cb */
BlockMatcher.prototype.each_fragment = function(cb) {
  var self = this;
  self._blocks.forEach(
  /**
   * @param {IndentBlock} block
   * @param {number} i
   */
  function(block, i) {
    var mi;
    mi = self._marker_indexes[i];
    cb(block, self._compose_line(
      block.end_str() + (mi < 0 || mi + 1 >= self._code.length ? '' : self._code[mi + 1]),
      i + 1
    ));
  });
};

/**
 * @param {string} prefix
 * @param {number} i
 * @private
 */
BlockMatcher.prototype._compose_line = function(prefix, i) {
  var self = this;
  if (self._blocks.length <= i) {
    return [prefix];
  }

  var b;
  b = self._blocks[i];
  var p;
  p = self._params[i];
  var bstart;
  bstart = [b.start_str()];
  if (!p) {
    return [prefix + bstart];
  }
  if (p.is_decl_empty()) {
    return [prefix + 'function(' + p.output_params() + ')' + bstart];
  }

  // we don't try to merge the prefix into first line.
  return arr_flatten([
    prefix,
    doc_lines(p.output_decls()),
    'function(' + p.output_params() + ')' + bstart
  ]);
};
/**
 * @param {string} name
 * @constructor
 */
var CallableType = function(name) {
  var self = this;
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
CallableType.prototype.set_parent = function(parent_name) {
  var self = this;
  self._parent = parent_name;
};

/** @param {string} name */
CallableType.prototype.add_method = function(name) {
  var self = this;
  var m;
  m = new CallableType(name);
  self._methods.push(m);
  return m;
};

/** @param {string|null} arg */
CallableType.prototype.add_arg = function(arg) {
  var self = this;
  self._args.push(arg);
};

/** @return {Object} */
CallableType.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {name: self._name, args: self._args};
  if (self._parent) {
    obj['parent'] = self._parent;
  }
  if (self._methods) {
    obj['methods'] = self._methods.map(
    /** @param {CallableType} m */
    function(m) {
      return m.extract();
    });
  }
  return obj;
};
/**
 * @param {!context.Context} context
 * @param {section.Head} head
 * @constructor
 */
var CodeParser = function(context, head) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {section.Head}
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
CodeParser.prototype.parse = function(input_lines) {
  var self = this;
  self._process(input_lines);
  if (!input_lines.length) {
    return;
  }
  assert(
    self._blocks.length <= 1,
    input_lines[0],
    'block stack depth: ' + self._blocks.length
  );
};

/**
 * @param {Array.<InputLine>} input_lines
 * @private
 */
CodeParser.prototype._process = function(input_lines) {
  var self = this;
  self._head.lines = input_lines;

  var first_line_indent;
  first_line_indent = 0;
  var code_lines;
  code_lines = self._make_code_lines(input_lines);
  code_lines.some(
  /** @param {SectionLine} line */
  function(line) {
    if (!(line instanceof InvalidLine)) {
      first_line_indent = line.indent;
      return true;
    }
    return false;
  });
  self._blocks = [new IndentBlock(0, first_line_indent, self._head)];
  self._head.add_block(self._blocks[0]);

  code_lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    // create blocks and assign lines to them.
    if (line instanceof InvalidLine) {
      self._invalid_lines.push(line);
      return;
    }

    var prev_indent;
    prev_indent = self._top_block().indent;
    var indent;
    indent = line.indent;

    if (indent > prev_indent) {
      self._deeper_indent(i, indent);
    }
    else if (indent < prev_indent) {
      self._shallower_indent(line, i);
    }

    self._add_invalid_lines();
    if (line.is_continuation) {
      self._continuation(line, i);
    }
    else if (line instanceof SeparatorLine) {
      self._separator(line, indent, i);
    }
    else {
      self._last_valid_line = /** @type {CodeLine} */(line);
      self._top_block().add(line);
    }
  });
  self._add_invalid_lines();
  self._pop_rest();
};

/**
 * @param {Array.<InputLine>} input_lines
 * @return {Array.<SectionLine>}
 * @private
 */
CodeParser.prototype._make_code_lines = function(input_lines) {
  var self = this;
  var cat;
  cat = new LineCategorizer(self._context);
  return input_lines.map(
  /** @param {InputLine} line */
  function(line) {
    return cat.create_line(line);
  });
};

/**
 * @param {number} i
 * @param {number} indent
 * @private
 */
CodeParser.prototype._deeper_indent = function(i, indent) {
  var self = this;
  // push a new block in the stack.
  var b;
  b = new IndentBlock(i, indent, self._last_valid_line);
  self._last_valid_line.add_block(b);
  self._blocks.push(b);
};

/**
 * @param {SectionLine} line
 * @param {number} i
 * @private
 */
CodeParser.prototype._shallower_indent = function(line, i) {
  var self = this;
  // back up levels.
  while (line.indent < self._top_block().indent) {
    self._blocks.pop();
    assert(
      self._blocks.length >= 1,
      line.input,
      'stack size zero (line ' + (i + 1) + '): ' + line.str
    );
  }
  if (line.indent > self._top_block().indent) {
    warn(line.input, 'indent level does not match');
  }
};

/**
 * @param {SectionLine} line
 * @param {number} indent
 * @param {number} i
 * @private
 */
CodeParser.prototype._separator = function(line, indent, i) {
  var self = this;
  var prev_b;
  prev_b = self._blocks.pop();
  var b;
  b = new IndentBlock(i, indent, prev_b.head());
  prev_b.head().add_block(b);
  self._blocks.push(b);
};

/**
 * @param {SectionLine} line
 * @param {number} i
 * @private
 */
CodeParser.prototype._continuation = function(line, i) {
  var self = this;
  var last_line;
  last_line = self._top_block().last_line();
  if (!last_line) {
    warn(line.input, 'continuation as a first line of block');
  }
  else {
    last_line.continue_lines.push(new InputLine(
      line.input.line.replace(/\|/, ' '),
      line.input.row_index
    ));
  }
  self._last_valid_line = /** @type {CodeLine} */(line);
};

/** @private */
CodeParser.prototype._add_invalid_lines = function() {
  var self = this;
  var top_block;
  top_block = self._top_block();
  self._invalid_lines.forEach(
  /** @param {SectionLine} line */
  function(line) {
    top_block.add(line);
  });
  self._invalid_lines = [];
};

/** @private */
CodeParser.prototype._pop_rest = function() {
  var self = this;
  // pop all the rest of blocks except one.
  while (self._blocks.length > 1) {
    self._blocks.pop();
  }
};

/** @private */
CodeParser.prototype._top_block = function() {
  var self = this;
  // there should be at least the root block.
  return self._blocks[self._blocks.length - 1];
};
/**
 * @param {!context.Context} context
 * @param {section.Head=} opt_head
 * @constructor
 */
var CodeScope = function(context, opt_head) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {section.Head}
   * @private
   */
  this._head = opt_head === undefined ? (new section.Global()) : opt_head;
};
CodeScope.prototype._classname = 'CodeScope';

/** @param {Array.<string>} lines */
CodeScope.prototype.process_lines = function(lines) {
  var self = this;
  var i;
  i = 0;
  self.process(lines.map(
  /** @param {string} line */
  function(line) {
    return new InputLine(line, i++);
  }));
};

/** @param {Array.<InputLine>} input_lines */
CodeScope.prototype.process = function(input_lines) {
  var self = this;
  new CodeParser(self._context, self._head).parse(input_lines);
  self._head.transform();
};

CodeScope.prototype.output = function() {
  var self = this;
  return arr_flatten(self._head.output()).map(
  /** @param {string} line */
  function(line) {
    return line.replace(/\s*$/, '');
  });
};
/**
 * @param {string} basedir
 * @param {string} infile
 * @param {string} outfile
 */
var transform_to_js = function(basedir, infile, outfile) {
  var pkg_name;
  pkg_name = infile.replace(/[\/\\][^\/\\]*$/, '');
  if (basedir && pkg_name.indexOf(basedir) == 0) {
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
    c.output().join('\n'),
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
var need_compile = function(src, dst) {
  if (!_path.existsSync(dst)) {
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
var compile_files = function(basedir, inout_filenames) {
  var i;
  i = 0;
  while (i < inout_filenames.length) {
    var infile;
    infile = inout_filenames[i++];
    var outfile;
    outfile = inout_filenames[i++];

    var logstr;
    logstr = '[' + infile + ' => ' + outfile + '] ';
    if (!_path.existsSync(infile)) {
      console.error(logstr + 'input not found');
    }
    else if (need_compile(infile, outfile)) {
      console.log(logstr + 'compiling');
      transform_to_js(basedir, infile, outfile);
    }
    else {
      console.log(logstr + 'skipping');
    }
  }
};
/*
parse file scope and separate code sections from comments.
*/
/** @typedef {GlobalComment|section.Code} */
var OutputSection;

/**
 * @param {string} pkg_name
 * @constructor
 */
var FileScope = function(pkg_name) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = (new context.Context(new context.Package(pkg_name)));
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

  self._context.is_file_scope = true;
};
FileScope.prototype._classname = 'FileScope';
/** @type {!context.Context} */
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
FileScope.prototype.process_lines = function(input) {
  var self = this;
  var gen;
  gen = new section.Generator(self);
  var input_list;
  input_list = new InputParser(input).parse();
  self._list = input_list.map(
  /**
   * @param {GlobalComment|InputSection} section
   * @param {number} index
   */
  function(section, index) {
    // convert InputSection to section.Code and leave GlobalComment as is.
    return section instanceof InputSection ? gen.generate(
      section.header,
      section.lines
    ) : section;
  });
};

/**
 * @param {!context.Name} name
 * @return {!context.Context}
 */
FileScope.prototype.copy_context = function(name) {
  var self = this;
  var ctxt;
  ctxt = self._context.clone();
  ctxt.name = name;
  ctxt.cls = self._context.cls;
  ctxt.is_file_scope = self._context.is_file_scope;
  return ctxt;
};

/**
 * @param {string} name
 * @return {!context.Context}
 */
FileScope.prototype.copy_context_with_name = function(name) {
  var self = this;
  var fullname;
  fullname = new context.Name(self._context.pkg, name);
  return self.copy_context(fullname);
};

/** @return {Array.<string>} */
FileScope.prototype.output = function() {
  var self = this;
  return arr_flatten(self._list.map(
  /** @param {OutputSection} elem */
  function(elem) {
    return elem.output();
  }));
};
/*
comment section in a file.
*/
/**
 * @param {Array.<InputLine>} lines
 * @constructor
 */
var GlobalComment = function(lines) {
  var self = this;
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._lines = lines;
};
GlobalComment.prototype._classname = 'GlobalComment';

GlobalComment.prototype.output = function() {
  var self = this;
  var result;
  result = [];
  var buffer;
  buffer = [];
  var state;
  state = 's';
  self._lines.forEach(
  /** @param {InputLine} line */
  function(line) {
    switch (state) {
      // starting state -- output all the blank lines as is.
      case 's':;
      if (!line.is_blank) {
        // first non-blank.
        result.push(buffer);
        buffer = [];
        state = 'n';
      }
      break;

      // in non-blank line section.
      case 'n':;
      if (line.is_blank) {
        state = 'a';
      }
      break;

      // blank line immediately following a non-blank.
      case 'a':;
      if (line.is_blank) {
        // run of blank lines is long enough now. flush the comments.
        result.push(['/*', buffer.splice(0, buffer.length - 1), '*/']);
        state = 'b';
      }
      else {
        state = 'n';
      }
      break;

      // b: blank line section.
      case 'b':;
      if (!line.is_blank) {
        result.push(buffer);
        buffer = [];
        state = 'n';
      }
      break;
    }
    buffer.push(line.line);
  });

  switch (state) {
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
/**
 * @param {number} line_no
 * @param {number} indent
 * @param {section.Head} head
 * @constructor
 */
var IndentBlock = function(line_no, indent, head) {
  var self = this;
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
   * @type {section.Head}
   * @private
   */
  this._head = head;
  /**
   * @type {Array.<SectionLine>}
   * @private
   */
  this._lines = ([]);
  // TODO: type to BlockType when it's enum.
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
    PARAMS: 3,
    MULT: 4,
    ADD: 5,
    LOG_AND: 6,
    LOG_OR: 7
  };

  var _BLOCK_OPEN;
  _BLOCK_OPEN = [' {', '{', '[', '(', '(', '(', '(', '('];
  var _LINE_PREFIX;
  _LINE_PREFIX = ['', '', '', '', '(', '(', '(', '('];
  var _LINE_SUFFIX;
  _LINE_SUFFIX = [';', ',', ',', ',', ') *', ') +', ') &&', ') ||'];
  var _END_SUFFIX;
  _END_SUFFIX = [';', '', '', '', ')', ')', ')', ')'];
  var _BLOCK_CLOSE;
  _BLOCK_CLOSE = ['}', '}', ']', ')', ')', ')', ')', ')'];

/** @param {SectionLine} line */
IndentBlock.prototype.add = function(line) {
  var self = this;
  self._lines.push(line);
};

IndentBlock.prototype.last_line = function() {
  var self = this;
  return self._lines[self._lines.length - 1];
};

/**
 * @param {function(SectionLine, number)} cb
 * @param {Object} ctxt
 */
IndentBlock.prototype.each_line = function(cb, ctxt) {
  var self = this;
  self._lines.forEach(cb, ctxt);
};

IndentBlock.prototype.head = function() {
  var self = this;
  return self._head;
};

/*
TODO: change marker's type to BlockType when it's enum.
*/
/** @param {number=} marker */
IndentBlock.prototype.transform = function(marker) {
  var self = this;
  if (marker !== undefined) {
    self._marker = marker;
  }
  self._lines.forEach(
  /** @param {SectionLine} line */
  function(line) {
    if (!(line instanceof InvalidLine)) {
      line.transform();
    }
  });
};

/** @return {string} */
IndentBlock.prototype.start_str = function() {
  var self = this;
  // string to open the block.
  return _BLOCK_OPEN[self._marker];
};

/** @return {string} */
IndentBlock.prototype.end_str = function() {
  var self = this;
  return _BLOCK_CLOSE[self._marker];
};

/** @return {output.Block} */
IndentBlock.prototype.output = function() {
  var self = this;
  // find the last valid line.
  var last_index;
  last_index = -1;
  self._lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    if (!(line instanceof InvalidLine) && !line.param) {
      last_index = i;
    }
  });
  assert(
    last_index >= 0 || self._marker == BlockType.BLOCK,
    self._lines.length ? self._lines[0].input : UnknownInputLine,
    'block with no valid lines: ' + self
  );

  var out;
  out = new output.Block();
  var accum_suffix;
  accum_suffix = '';
  self._lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    var out_line;
    out_line = line.output();
    if (line instanceof InvalidLine) {
      accum_suffix += out_line.line_suffix;
      out_line.line_suffix = '';
    }
    else {
      out_line.line_suffix = accum_suffix + out_line.line_suffix;
      if (!line.is_block_statement) {
        out_line.line_prefix += _LINE_PREFIX[self._marker];
        out_line.line_suffix += (
          i == last_index ? _END_SUFFIX[self._marker] : _LINE_SUFFIX[self._marker]
        );
      }
      accum_suffix = '';
    }
    out.append_line(out_line);
  });
  return out;
};
/*
a line of input file. keeps track of the row index.
*/
/**
 * @param {string} line
 * @param {number} row_index
 * @constructor
 */
var InputLine = function(line, row_index) {
  var self = this;
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
  var self = this;
  return self._row_index + 1;
});

/*
the line contents with indentation stripped off.
trailing whitespace should have been stripped already.
*/
/** @type {string} */
InputLine.prototype.trim;
InputLine.prototype.__defineGetter__('trim', function() {
  var self = this;
  var re;
  re = /\S.*/.exec(self._line);
  return re ? re[0] : '';
});

/** @type {boolean} */
InputLine.prototype.starts_with_colon;
InputLine.prototype.__defineGetter__('starts_with_colon', function() {
  var self = this;
  return self._line.substr(0, 1) == ':';
});

/** @type {boolean} */
InputLine.prototype.is_blank;
InputLine.prototype.__defineGetter__('is_blank', function() {
  var self = this;
  return /^\s*$/.test(self._line);
});

/** @type {boolean} */
InputLine.prototype.is_indented;
InputLine.prototype.__defineGetter__('is_indented', function() {
  var self = this;
  return /^\s/.test(self._line);
});

/** @type {number} */
InputLine.prototype.indent;
InputLine.prototype.__defineGetter__('indent', function() {
  var self = this;
  var re;
  re = /\S/.exec(self._line);
  return re ? re.index : 0;
});

  var UnknownInputLine;
  UnknownInputLine = new InputLine('', -1);
/*
parses input lines into lines and sections.
'line' is used only during processing.
*/
/**
 * @param {Array.<string>} input
 * @constructor
 */
var InputParser = function(input) {
  var self = this;
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
InputParser.prototype.parse = function() {
  var self = this;
  self._input.forEach(
  /**
   * @param {string} line
   * @param {number} index
   */
  function(line, index) {
    line = line.trimRight();
    self._process_line(new InputLine(line, index));
  });
  self._flush_buffer();
  return self._result;
};

/**
 * @param {InputLine} line
 * @private
 */
InputParser.prototype._process_line = function(line) {
  var self = this;
  if (line.starts_with_colon) {
    // should be a start of a code section.
    self._flush_buffer();
    self._last_valid_index = 0;
  }
  else if (line.is_indented) {
    // indented line -- continues either comment or code section.
    if (self._last_valid_index !== null) {
      self._last_valid_index = self._buffer.length;
    }
  }
  else if (!line.is_blank) {
    // global comment.
    if (self._last_valid_index !== null) {
      // close the code section.
      self._flush_buffer();
    }
  }
  // anything else is invalid line -- continues either comment or code section.
  self._buffer.push(line);
};

/** @private */
InputParser.prototype._flush_buffer = function() {
  var self = this;
  while (self._buffer.length) {
    var next_buffer;
    next_buffer = [];
    if (self._last_valid_index !== null) {
      var section;
      section = new InputSection(self._buffer[0]);
      self._result.push(section);
      self._buffer.forEach(
      /**
       * @param {InputLine} line
       * @param {number} index
       */
      function(line, index) {
        if (index == 0) {
          // we already passed the header line to section.
          return;
        }
        else if (index <= self._last_valid_index) {
          section.push(line);
        }
        else {
          // end of section invaild lines.
          next_buffer.push(line);
        }
      });
    }
    else {
      // we'll give buffer a new array so no need to clone for global comment.
      self._result.push(new GlobalComment(self._buffer));
    }
    self._last_valid_index = null;
    self._buffer = next_buffer;
  }
};
/*
input code section.
*/
/**
 * @param {InputLine} header
 * @constructor
 */
var InputSection = function(header) {
  var self = this;
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
   * @type {section.Code}
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
/** @type {section.Code} */
InputSection.prototype.code;
InputSection.prototype.__defineGetter__('code', function() {
return this._code;
});
InputSection.prototype.__defineSetter__('code', function(value) {
this._code = value;
});

/** @param {InputLine} line */
InputSection.prototype.push = function(line) {
  var self = this;
  self._lines.push(line);
};
/*
fragments of string interlaced by block references.
maintains:
- at least one fragment.
- exactly one more fragments than blocks.
*/
/** @constructor */
var InterlacedLine = function() {
  var self = this;
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
InterlacedLine.prototype.first_fragment = function() {
  var self = this;
  return self._fragments[0];
};

/** @param {string} str */
InterlacedLine.prototype.add_str = function(str) {
  var self = this;
  var last_idx;
  last_idx = self._fragments.length - 1;
  self._fragments[last_idx] = self._fragments[last_idx] + str;
};

/** @param {Object} block */
InterlacedLine.prototype.add_block = function(block) {
  var self = this;
  self._fragments.push('');
  self._blocks.push(block);
};

/**
 * @param {function(Object, string, number)} cb
 * @param {*=} ctxt
 */
InterlacedLine.prototype.each = function(cb, ctxt) {
  var self = this;
  self._blocks.forEach(
  /**
   * @param {Object} block
   * @param {number} i
   */
  function(block, i) {
    cb.call(ctxt, block, self._fragments[i + 1], i);
  });
};
/*
either blank line or comment only line.
*/
/**
 * @param {InputLine} input
 * @constructor
 */
var InvalidLine = function(input) {
  var self = this;
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
  var self = this;
  return self._input.line;
});

/** @return {output.Line} */
InvalidLine.prototype.output = function() {
  var self = this;
  var out;
  out = new output.Line(self._input);
  out.append_line(self._input.trim);
  return out;
};
/** @typedef {CodeLine|SeparatorLine|InvalidLine} */
var SectionLine;

/**
 * @param {!context.Context} context
 * @constructor
 */
var LineCategorizer = function(context) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
};
LineCategorizer.prototype._classname = 'LineCategorizer';

/**
 * @param {InputLine} input
 * @return {SectionLine}
 */
LineCategorizer.prototype.create_line = function(input) {
  var self = this;
  var parsed;
  parsed = new LineParser(input);
  if (!parsed.is_valid) {
    return new InvalidLine(input);
  }
  if (parsed.is_separator) {
    return new SeparatorLine(input, parsed);
  }
  return new CodeLine(self._context, input, parsed);
};
/*
decodes blockc markers.
*/
/**
 * @param {!context.Context} context
 * @param {Array.<string>} line
 * @param {InputLine} input_line
 * @constructor
 */
var LineDecoder = function(context, line, input_line) {
  var self = this;
  /**
   * @type {!context.Context}
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
LineDecoder.prototype.transform = function(blocks) {
  var self = this;
  // make the fragments and blocks.
  // pass a shallow copy of the blocks.
  self._split_to_fragments(blocks.slice(0));
  self._transform_blocks();
};

/**
 * @param {Array.<IndentBlock>} blocks
 * @private
 */
LineDecoder.prototype._split_to_fragments = function(blocks) {
  var self = this;
  // go thru all the matches one by one.
  self._line.forEach(
  /**
   * @param {string} seg
   * @param {number} i
   */
  function(seg, i) {
    if (/^['"\/]/.test(seg)) {
      // string, regular expression, and comment don't need to be split.
      self._fragments.add_str(seg);
    }
    else {
      self._split_segment(seg, i == self._line.length - 1, blocks);
    }
  });
};

/**
 * @param {string} seg
 * @param {boolean} last_seg
 * @param {Array.<IndentBlock>} blocks
 * @private
 */
LineDecoder.prototype._split_segment = function(seg, last_seg, blocks) {
  var self = this;
  var re;
  re = /(\{#\}|\[#\]|\(#\)|##?)/g;
  var last_index;
  last_index = 0;
  var match;
  match = re.exec(seg);
  var sub_context;
  sub_context = null;
  while (match) {
    self._fragments.add_str(seg.substring(last_index, match.index));
    var block;
    block = {marker: match[1]};
    if (blocks.length == 0) {
      warn(self._input_line, 'ran out of blocks: ' + seg);
    }
    else {
      var b;
      b = blocks.shift();
      if (block.marker == '##') {
        if (!sub_context) {
          sub_context = self._context.clone();
          sub_context.is_file_scope = false;
        }
        block.params = new ParamSet(sub_context, b);
      }
      block.block = b;
    }

    self._fragments.add_block(block);
    last_index = re.lastIndex;
    match = re.exec(seg);
  }

  var last_fragment;
  last_fragment = seg.substr(last_index);
  if (last_fragment) {
    self._fragments.add_str(last_fragment);
    if (last_seg && blocks.length > 0) {
      self._fragments.add_block({marker: '#', block: blocks.shift()});
      self._is_block_statement = true;
    }
  }
  assert(!last_seg || blocks.length == 0, self._input_line, 'too many blocks for the #s');
};

/** @private */
LineDecoder.prototype._transform_blocks = function() {
  var self = this;
  self._fragments.blocks.forEach(
  /** @param {Object} b */
  function(b) {
    // transform the blocks.
    if (b.params) {
      b.params.transform();
    }
    if (b.block) {
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
LineDecoder.prototype.first_line = function() {
  var self = this;
  // there should be at least one fragment.
  return self._compose_line(self._fragments.first_fragment(), 0);
};

/** @param {function(IndentBlock, Array.<string>)} cb */
LineDecoder.prototype.each_fragment = function(cb) {
  var self = this;
  self._fragments.each(
  /**
   * @param {Object} b
   * @param {string} f
   * @param {number} i
   */
  function(b, f, i) {
    cb(b.block, self._compose_line(
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
LineDecoder.prototype._compose_line = function(prefix, i) {
  var self = this;
  if (self._fragments.blocks.length <= i) {
    return [prefix];
  }

  var b;
  b = self._fragments.blocks[i];
  var bstart;
  bstart = [b.block.start_str()];
  if (!b.params) {
    return [prefix + bstart];
  }
  if (b.params.is_decl_empty()) {
    return [prefix + 'function(' + b.params.output_params() + ')' + bstart];
  }

  // we don't try to merge the prefix into first line.
  return arr_flatten([
    prefix,
    doc_lines(b.params.output_decls()),
    'function(' + b.params.output_params() + ')' + bstart
  ]);
};
/*
First pass line parsing for constructing the block structure.
*/

/**
 * @param {InputLine} input
 * @constructor
 */
var LineParser = function(input) {
  var self = this;
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

  self._process();
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
LineParser.prototype._process = function() {
  var self = this;
  if (/^\s*$/.test(self._input.line) || /^\s*\/\//.test(self._input.line)) {
    // blank or comment line. Nothing to be done.
    return;
  }
  self._is_valid = true;

  self._check_spaces();
  self._check_continuation();
  self._check_separator();
};

/** @private */
LineParser.prototype._check_spaces = function() {
  var self = this;
  var spaces_re;
  spaces_re = /^(\s*)(.*[\S])(\s*)$/.exec(self._input.line);

  self._indent = spaces_re[1].length;
  if (!/ */.test(spaces_re[1])) {
    warn(self._input, 'non-ascii 0x20 space for indentation');
  }

  if (spaces_re[3] != '') {
    warn(self._input, 'trailing space');
  }
};

/** @private */
LineParser.prototype._check_continuation = function() {
  var self = this;
  var cont_re;
  cont_re = /^\s*\|/.exec(self._input.line);
  self._is_continuation = !!cont_re;
};

/** @private */
LineParser.prototype._check_separator = function() {
  var self = this;
  self._is_separator = /^\s*--\s*$/.test(self._input.line);
};
/**
 * @param {!context.Context} context
 * @param {InputLine} input
 * @constructor
 */
var LineTransformer = function(context, input) {
  var self = this;
  /**
   * @type {!context.Context}
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
LineTransformer.prototype.pkg_ref = function(name) {
  var self = this;
  // relative package reference.
  return self._context.pkg.replace(name);
};

/**
 * @param {string} type
 * @return {string}
 */
LineTransformer.prototype.cast = function(type) {
  var self = this;
  return '/** @type {' + new TypeDecoder(self._context.pkg, type).output() + '} */';
};

/**
 * @param {string} type
 * @return {string}
 */
LineTransformer.prototype.type = function(type) {
  var self = this;
  return new TypeDecoder(self._context.pkg, type).output();
};

/**
 * @param {string} args
 * @return {string}
 */
LineTransformer.prototype.parent_call = function(args) {
  var self = this;
  var end_str;
  end_str = args ? ', ' + args + ')' : ')';
  if (self._context.is_ctor) {
    return self._context.cls.ctor.parent_name() + '.call(this' + end_str;
  }
  else if (self._context.is_method) {
    return [
      self._context.cls.ctor.parent_name(),
      '.prototype.',
      self._context.name.id,
      '.call(this',
      end_str
    ].join('');
  }
  else {
    warn(self._input, 'parent call appeared in non-ctor / non-method.');
    return '%(' + args + ')';
  }
};
/**
 * @param {InputLine} line
 * @param {string=} opt_msg
 */
var warn = function(line, opt_msg) {
  var msg = opt_msg === undefined ? ('*warning*') : opt_msg;
  console.warn(msg + ' (line ' + line.line_no + '): ' + line.line);
};

/**
 * @param {*} check
 * @param {InputLine=} opt_line
 * @param {string=} opt_msg
 */
var assert = function(check, opt_line, opt_msg) {
  var line = opt_line === undefined ? (UnknownInputLine) : opt_line;
  var msg = opt_msg === undefined ? ('*assertion*') : opt_msg;
  console.assert(
    check,
    msg + (line ? ' (line ' + line.line_no + '): ' + line.line : '')
  );
};
/*
Pseudo member is a place holder for class members that don't exist, but there
are accessors for.
*/

/**
 * @param {string} name
 * @param {TypeDecoder} type
 * @param {string} access_type
 * @param {boolean} is_pseudo
 * @constructor
 */
var Member = function(name, type, access_type, is_pseudo) {
  var self = this;
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
 * @param {!context.Name} class_name
 * @return {Array.<string>}
 */
Member.prototype.output_decl = function(class_name) {
  var self = this;
  if (self._declared) {
    return [];
  }
  self._declared = true;
  // TODO: this member decl always allows setting a value to it even when only the
  // getter is provided.
  return [
    '/** @type {' + self._type.output() + '}' + ' */',
    class_name.property(self._name).decl() + ';'
  ];
};

/*
output a getter or a setter.
*/
/**
 * @param {!context.Name} class_name
 * @param {boolean} is_getter
 * @param {Array} body
 * @param {ParamSet=} params
 * @return {Array}
 */
Member.prototype.output_accessor = function(class_name, is_getter, body, params) {
  var self = this;
  var p;
  p = self._is_pseudo && params ? params.output_params() : 'value';
  return [
    is_getter ? (
      class_name.property('__defineGetter__').decl() + "('" + self._name + "', function() {"
    ) : (
      class_name.property('__defineSetter__').decl() + "('" + self._name + "', function(" + p + ') {'
    ),
    body,
    '});'
  ];
};

/*
produce necessary accessor methods based on the access type specification.
*/
/**
 * @param {!context.Name} class_name
 * @return {Array}
 */
Member.prototype.output_accessors = function(class_name) {
  var self = this;
  if (!self._access_type || self._is_pseudo) {
    return [];
  }
  var result;
  result = [self.output_decl(class_name)];
  if ('+&'.indexOf(self._access_type) >= 0) {
    result.push(self.output_accessor(class_name, true, ['return this._' + self._name + ';']));
  }
  if ('*&'.indexOf(self._access_type) >= 0) {
    result.push(self.output_accessor(class_name, false, ['this._' + self._name + ' = value;']));
  }
  return result;
};
/*
Function parameter and / or member declarion.
*/

/**
 * @param {!context.Context} context
 * @param {boolean} is_ctor
 * @param {InputLine} input
 * @param {parser.Result} parsed
 * @constructor
 */
var Param = function(context, is_ctor, input, parsed) {
  var self = this;
  /**
   * @type {!context.Context}
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

  if (!(parsed.tokens instanceof parser.ParamLine)) {
    return;
  }

  self._line = parsed.tokens;
  self._success = true;
  self._type = new TypeDecoder(self._context.pkg, self._line.type);

  self._value_line = self._line.init && !self._line.init.is_empty ? self._line.init.list : null;
  if (self.is_member && self.init_type != '$' && !self._value_line) {
    // member with no initializer or optional param init.
    self._value_line = ['null'];
  }

  // sanity check the param consistency.
  if (!is_ctor && self.is_member) {
    warn(input, 'member param for non-constructor method');
  }
  if (!self.is_member && self.init_type != '?' && self._value_line) {
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
  var self = this;
  return self._line.is_member;
});

/** @type {string} */
Param.prototype.name;
Param.prototype.__defineGetter__('name', function() {
  var self = this;
  return self._line.name;
});

/** @type {string} */
Param.prototype.access_type;
Param.prototype.__defineGetter__('access_type', function() {
  var self = this;
  return self._line.access;
});

/** @type {string} */
Param.prototype.init_type;
Param.prototype.__defineGetter__('init_type', function() {
  var self = this;
  return self._line.marker;
});

/** @type {boolean} */
Param.prototype.has_init;
Param.prototype.__defineGetter__('has_init', function() {
  var self = this;
  return !!self._value_line;
});

/**
 * @return {string}
 * @private
 */
Param.prototype._param_name = function() {
  var self = this;
  return (self.has_init ? 'opt_' : '') + self.name;
};

/** @return {string} */
Param.prototype.output_decl = function() {
  var self = this;
  return self._type && self.init_type != '' ? ([
    '@param {',
    self._type.output(),
    self.init_type == '?' ? '=' : '',
    '} ',
    self._param_name()
  ].join('')) : '';
};

/** @return {string} */
Param.prototype.output_param = function() {
  var self = this;
  return self.init_type == '' ? '' : self._param_name();
};

/*
Variable initialization output as first statements of function body.
*/
/** @param {output.Line} out */
Param.prototype.output_init = function(out) {
  var self = this;
  var pname;
  pname = self._param_name();

  if (self.is_member) {
    out.append_prefix_line('/**');
    if (self._type) {
      out.append_prefix_line(' * @type {' + self._type.output() + '}');
    }
    out.append_prefix_line(' * @private');
    out.append_prefix_line(' */');
  }
  if (self.is_member || self.has_init) {
    out.line_prefix = [
      self.is_member ? 'this._' : 'var ',
      self.name,
      ' = '
    ].join('');
    if (self.init_type != '') {
      out.line_prefix += pname;
      if (self.has_init) {
        out.line_prefix += ' === undefined ? (';
        out.line_suffix = ') : ' + pname;
      }
    }
    else {
      out.line_prefix += '(';
      out.line_suffix = ')';
    }
  }
  else {
    out.remove_empty_lines();
  }
};

/** @return {string} */
Param.prototype.output_argtype = function() {
  var self = this;
  var type;
  type = self._type.output();
  var re;
  re = /^\!?([a-zA-Z][\w\.]*)$/.exec(type);
  if (!re) {
    return 'null';
  }
  var type_name;
  type_name = re[1];
  return ARG_TYPE_REPLACE_MAP[type_name] || type_name;
};

/** @return {?string} */
Param.prototype.argtype = function() {
  var self = this;
  var type;
  type = self._type.output();
  var re;
  re = /^\!?([a-zA-Z][\w\.]*)$/.exec(type);
  if (!re) {
    return null;
  }
  var type_name;
  type_name = re[1];
  return ARG_TYPE_REPLACE_MAP[type_name] || type_name;
};
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
 * @param {!context.Context} context
 * @param {IndentBlock} block
 * @param {boolean=} opt_is_ctor
 * @constructor
 */
var ParamSet = function(context, block, opt_is_ctor) {
  var self = this;
  /**
   * @type {!context.Context}
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

ParamSet.prototype.transform = function() {
  var self = this;
  var param_done;
  param_done = false;
  self._block.each_line(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    if (param_done) {
      return;
    }
    if (line instanceof SeparatorLine) {
      param_done = true;
      return;
    }
    if (line instanceof CodeLine && !line.is_continuation) {
      var p;
      p = self._add_line(/** @type {CodeLine} */(line), i);
      if (p) {
        line.param = p;
      }
      else {
        param_done = true;
    // skip invalid lines and continuation lines.
      }
    }
  }, self._context);
};

/**
 * @param {CodeLine} line
 * @param {number} index
 * @return {Param|boolean}
 * @private
 */
ParamSet.prototype._add_line = function(line, index) {
  var self = this;
  var p;
  p = new Param(self._context, self._is_ctor, line.input, line.parsed);
  if (!p.success) {
    if (index != 0 || self._context.is_file_scope) {
      return null;
    }
    // could be the return type.
    return self._try_return_type(line.str);
  }

  self._params.push(p);
  if (p.is_member) {
    self._context.cls.add_member(p.name, p.type, p.access_type);
  }
  return p;
};

/**
 * @param {string} line
 * @return {boolean}
 * @private
 */
ParamSet.prototype._try_return_type = function(line) {
  var self = this;
  var re;
  re = /^\s*\\(.*)\\\s*$/.exec(line);
  if (!re) {
    return false;
  }
  self._return_type = new TypeDecoder(self._context.pkg, re[1]);
  return true;
};

/** @param {string} return_type */
ParamSet.prototype.set_return_type = function(return_type) {
  var self = this;
  if (return_type) {
    self._return_type = new TypeDecoder(self._context.pkg, return_type);
  }
};

/** @return {boolean} */
ParamSet.prototype.is_empty = function() {
  var self = this;
  return self._params.length == 0;
};

/** @return {boolean} */
ParamSet.prototype.is_init_empty = function() {
  var self = this;
  return !self._params.some(
  /** @param {Param} p */
  function(p) {
    return p.is_member || p.init_type == '?';
  });
};

/** @return {boolean} */
ParamSet.prototype.is_decl_empty = function() {
  var self = this;
  return !self._return_type && !self._params.some(
  /** @param {Param} p */
  function(p) {
    return !!p.type;
  });
};

/** @return {Array.<string>} */
ParamSet.prototype.output_decls = function() {
  var self = this;
  var result;
  result = self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.output_decl();
  }).filter(
  /** @param {string} s */
  function(s) {
    return !!s;
  });
  if (self._return_type) {
    result.push('@return {' + self._return_type.output() + '}');
  }
  return result;
};

/** @return {string} */
ParamSet.prototype.output_params = function() {
  var self = this;
  // function parameter output.
  return self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.output_param();
  }).filter(
  /** @param {string} s */
  function(s) {
    return !!s;
  }).join(', ');
};

/** @return {string} */
ParamSet.prototype.output_argtypes = function() {
  var self = this;
  return '[' + self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.output_argtype();
  }).join(', ') + ']';
};

/** @param {CallableType} types */
ParamSet.prototype.set_argtypes = function(types) {
  var self = this;
  self._params.forEach(
  /** @param {!Param} p */
  function(p) {
    types.add_arg(p.argtype());
  });
};
/**
 * @param {InputLine} input
 * @param {LineParser} parser
 * @constructor
 */
var SeparatorLine = function(input, parser) {
  var self = this;
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
  var self = this;
  return false;
});

/** @return {output.Line} */
SeparatorLine.prototype.output = function() {
  var self = this;
  return null;
};
/** @constructor */
var StringSet = function() {
  var self = this;
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
StringSet.prototype.toString = function() {
  var self = this;
  return self._list.join('|');
};

/** @return {Array.<string>} */
StringSet.prototype.list = function() {
  var self = this;
  return self._list;
};

/** @return {number} */
StringSet.prototype.size = function() {
  var self = this;
  return self._list.length;
};

/**
 * @param {string} str
 * @return {boolean}
 */
StringSet.prototype.has = function(str) {
  var self = this;
  return self._map[str];
};

/** @param {Array.<string>} strs */
StringSet.prototype.add_all = function(strs) {
  var self = this;
  strs.forEach(
  /** @param {string} str */
  function(str) {
    self.add(str);
  });
};

/** @param {string} str */
StringSet.prototype.add = function(str) {
  var self = this;
  self._list.push(str);
  self._map[str] = true;
};

/**
 * @param {Array.<string>} strs
 * @return {Array.<string>}
 */
StringSet.prototype.filter_out = function(strs) {
  var self = this;
  // remove the strings that are in this set.
  return strs.filter(
  /** @param {string} f */
  function(f) {
    return !self._map[f];
  });
};


/*
where -- maps class name to file name where its defined.
depends -- maps file name to array of required class names.
*/
/** @constructor */
var ClassDeps = function() {
  var self = this;
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
ClassDeps.prototype.toString = function() {
  var self = this;
  return Object.keys(/** @type {!Object} */(self._depends)).map(
  /** @param {string} k */
  function(k) {
    return '[' + k + ':' + self._depends[k].join('|') + ']';
  }).join('');
};

/** @param {Array.<string>} files */
ClassDeps.prototype.load = function(files) {
  var self = this;
  files.forEach(
  /** @param {string} file */
  function(file) {
    self._depends[file] = [];
    var tk;
    tk = JSON.parse(_fs.readFileSync(file.replace(/\.js/, '.tk'), 'utf-8'));
    tk['cls'].forEach(
    /** @param {*} cls */
    function(cls) {
      self._where[cls.name] = file;
      if (cls['parent']) {
        self._depends[file].push(cls['parent']);
      }
    });
    // remove self dependencies.
    self._depends[file] = self._depends[file].filter(
    /** @param {string} dep */
    function(dep) {
      return self._where[dep] != file;
    });
  });
};

/**
 * @param {string} file
 * @return {boolean}
 */
ClassDeps.prototype.has_deps = function(file) {
  var self = this;
  var dep;
  dep = self._depends[file];
  return !!dep && !!dep.length;
};

/**
 * @param {string} file
 * @param {StringSet} provided_files
 */
ClassDeps.prototype.remove_deps = function(file, provided_files) {
  var self = this;
  self._depends[file] = self._depends[file].filter(
  /**
   * @param {string} dep
   * @param {number} i
   */
  function(dep, i) {
    return !provided_files.has(self._where[dep]);
  });
};


/**
 * @param {Array.<string>} files
 * @return {Array.<string>}
 */
var create_sorted_list = function(files) {
  var deps;
  deps = new ClassDeps();
  deps.load(files);

  // sort the files in inheritance order.
  var all;
  all = files.concat();
  var sorted;
  sorted = new StringSet();
  while (all.length) {
    var found;
    found = new StringSet();
    all.forEach(
    /** @param {string} f */
    function(f) {
      // remove the dependencies already satisfied.
      deps.remove_deps(f, sorted);

      if (!deps.has_deps(f)) {
        found.add(f);
      }
    });

    if (!found.size()) {
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
/**
 * @param {!context.Package} pkg
 * @param {string} type
 * @constructor
 */
var TypeDecoder = function(pkg, type) {
  var self = this;
  /**
   * @type {!context.Package}
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
  self._process();
};
TypeDecoder.prototype._classname = 'TypeDecoder';

/** @private */
TypeDecoder.prototype._process = function() {
  var self = this;
  self._decoded = self._pkg.replace_str(self._type);
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
  function(re_type) {
    self._decoded = self._decoded.replace(new RegExp(re_type[0], 'g'), re_type[1]);
  });
};

/** @return {string} */
TypeDecoder.prototype.output = function() {
  var self = this;
  return self._decoded;
};
/** @constructor */
var TypeSet = function() {
  var self = this;
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
TypeSet.prototype.add_ctor = function(name) {
  var self = this;
  self._ctor = new CallableType(name);
  self._classes.push(self._ctor);
  return self._ctor;
};

/**
 * @param {string} name
 * @return {CallableType}
 */
TypeSet.prototype.add_funct = function(name) {
  var self = this;
  var fn;
  fn = new CallableType(name);
  self._functs.push(fn);
  return fn;
};

/** @return {CallableType} */
TypeSet.prototype.get_current_ctor = function() {
  var self = this;
  return self._ctor;
};

/** @param {string} parent_name */
TypeSet.prototype.set_parent = function(parent_name) {
  var self = this;
  if (!self._ctor) {
    throw 'set parent called w/o ctor.';
  }
  self._ctor.set_parent(parent_name);
};

/** @return {Object} */
TypeSet.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {};
  if (self._classes) {
    obj['cls'] = self._classes.map(
    /** @param {TypeSet} cls */
    function(cls) {
      return cls.extract();
    });
  }
  if (self._functs) {
    obj['fns'] = self._functs.map(
    /** @param {CallableType} fn */
    function(fn) {
      return fn.extract();
    });
  }
  return obj;
};
/** @param {string|Array} lines */
var arr_flatten = function(lines) {
  if (typeof(lines) == 'string') {
    return [lines];
  }
  if (lines instanceof output.Line || lines instanceof output.Block) {
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
  function(arr, line) {
    return arr.concat(arr_flatten(line));
  }, []);
};

/** @param {Object} obj */
var check = function(obj) {
  console.log(_util.inspect(obj, false, null));
};

/**
 * @param {number} num
 * @return {string}
 */
var whitespaces = function(num) {
  var s;
  s = '';
  var i;
  i = 0;
  for (; i < num; i++) {
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
var obj_stringify = function(obj, compact, name, opt_level) {
  var level = opt_level === undefined ? (0) : opt_level;
  var start_str;
  start_str = whitespaces(level * 2);
  if (name) {
    start_str += name + ':';
  }

  if (obj instanceof Array) {
    var children;
    children = obj.map(
    /** @param {Object} c */
    function(c) {
      return obj_stringify(c, compact, undefined, level + 1);
    }).filter(
    /** @param {string} c */
    function(c) {
      return !!c;
    });
    if (children.length) {
      return start_str + '[\n' + children.join('') + whitespaces(level * 2) + ']\n';
    }
    else {
      return compact ? '' : start_str + '[]\n';
    }
  }
  else if (obj instanceof Object) {
    var keys;
    keys = [];
    var key;
    for (key in obj) {
      keys.push(key);
    }
    var children;
    children = keys.map(
    /** @param {string} k */
    function(k) {
      return obj_stringify(obj[k], compact, k, level + 1);
    }).filter(
    /** @param {string} c */
    function(c) {
      return !!c;
    });
    if (children.length) {
      return start_str + '{\n' + children.join('') + whitespaces(level * 2) + '}\n';
    }
    else {
      return compact ? '' : start_str + '{}\n';
    }
  }
  else {
    return start_str + obj + '\n';
  }
};

/** @param {Array.<string>} annotations */
var doc_lines = function(annotations) {
  var alist;
  alist = arr_flatten(annotations);
  if (alist.length == 0) {
    return [];
  }
  if (alist.length == 1) {
    return ['/** ' + alist[0] + ' */'];
  }
  return [
    '/**',
    alist.map(
    /** @param {string} annotation */
    function(annotation) {
      return ' * ' + annotation;
    }),
    ' */'
  ];
};
/** @constructor */
context.Class = function() {
  var self = this;
  /**
   * @type {section.Constructor}
   * @private
   */
  this._ctor = (null);
  /**
   * @type {!Object.<string, Member>}
   * @private
   */
  this._members = ({});
};
context.Class.prototype._classname = 'context.Class';
/** @type {section.Constructor} */
context.Class.prototype.ctor;
context.Class.prototype.__defineGetter__('ctor', function() {
return this._ctor;
});
context.Class.prototype.__defineSetter__('ctor', function(value) {
this._ctor = value;
});

/** @return {!context.Name} */
context.Class.prototype.name = function() {
  var self = this;
  return self._ctor.context.name;
};

/** @param {string} name */
context.Class.prototype.member = function(name) {
  var self = this;
  return self._members[name];
};

/**
 * @param {string} name
 * @param {Member} member
 */
context.Class.prototype.set_member = function(name, member) {
  var self = this;
  self._members[name] = member;
};

/**
 * @param {string} method_name
 * @return {!context.Name}
 */
context.Class.prototype.method_name = function(method_name) {
  var self = this;
  return self.name().property(method_name);
};

/**
 * @param {string} name
 * @param {TypeDecoder} type
 * @param {string} access_type
 * @param {boolean=} opt_is_pseudo
 * @return {Member}
 */
context.Class.prototype.add_member = function(name, type, access_type, opt_is_pseudo) {
  var self = this;
  var is_pseudo = opt_is_pseudo === undefined ? (false) : opt_is_pseudo;
  var m;
  m = new Member(name, type, access_type, is_pseudo);
  self._members[name] = m;
  return m;
};

/** @return {Array} */
context.Class.prototype.output_accessors = function() {
  var self = this;
  var class_name;
  class_name = self.name();
  return Object.keys(self._members).map(
  /** @param {string} name */
  function(name) {
    return self._members[name].output_accessors(class_name);
  });
};
/**
 * @param {!context.Package} pkg
 * @constructor
 */
context.Context = function(pkg) {
  var self = this;
  /**
   * @type {!context.Package}
   * @private
   */
  this._pkg = pkg;
  /**
   * @type {!context.Name}
   * @private
   */
  this._name = (new context.Name(self._pkg, ''));
  /**
   * @type {context.Class}
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
context.Context.prototype._classname = 'context.Context';
/** @type {!context.Package} */
context.Context.prototype.pkg;
context.Context.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
context.Context.prototype.__defineSetter__('pkg', function(value) {
this._pkg = value;
});
/** @type {!context.Name} */
context.Context.prototype.name;
context.Context.prototype.__defineGetter__('name', function() {
return this._name;
});
context.Context.prototype.__defineSetter__('name', function(value) {
this._name = value;
});
/** @type {context.Class} */
context.Context.prototype.cls;
context.Context.prototype.__defineGetter__('cls', function() {
return this._cls;
});
context.Context.prototype.__defineSetter__('cls', function(value) {
this._cls = value;
});
/** @type {boolean} */
context.Context.prototype.is_ctor;
context.Context.prototype.__defineGetter__('is_ctor', function() {
return this._is_ctor;
});
context.Context.prototype.__defineSetter__('is_ctor', function(value) {
this._is_ctor = value;
});
/** @type {boolean} */
context.Context.prototype.is_method;
context.Context.prototype.__defineGetter__('is_method', function() {
return this._is_method;
});
context.Context.prototype.__defineSetter__('is_method', function(value) {
this._is_method = value;
});
/** @type {boolean} */
context.Context.prototype.is_file_scope;
context.Context.prototype.__defineGetter__('is_file_scope', function() {
return this._is_file_scope;
});
context.Context.prototype.__defineSetter__('is_file_scope', function(value) {
this._is_file_scope = value;
});

/** @return {!context.Context} */
context.Context.prototype.clone = function() {
  var self = this;
  var c;
  c = new context.Context(self._pkg);
  var p;
  for (p in self) {
    if (self.hasOwnProperty(p)) {
      c[p] = self[p];
    }
  }
  return c;
};
/*
Name in file scope.
*/

/**
 * @param {!context.Package} pkg
 * @param {string} id
 * @constructor
 */
context.Name = function(pkg, id) {
  var self = this;
  /**
   * @type {!context.Package}
   * @private
   */
  this._pkg = pkg;
  /**
   * @type {string}
   * @private
   */
  this._id = id;
};
context.Name.prototype._classname = 'context.Name';
/** @type {!context.Package} */
context.Name.prototype.pkg;
context.Name.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
/** @type {string} */
context.Name.prototype.id;
context.Name.prototype.__defineGetter__('id', function() {
return this._id;
});

/** @return {string} */
context.Name.prototype.decl = function() {
  var self = this;
  return (self._pkg.empty() ? 'var ' : '') + self._pkg.fullname(self._id);
};

/** @return {string} */
context.Name.prototype.ref = function() {
  var self = this;
  return self._pkg.fullname(self._id);
};

/**
 * @param {string} id
 * @return {!context.Name}
 */
context.Name.prototype.property = function(id) {
  var self = this;
  return new context.Name(new context.Package(self.ref() + '.prototype'), id);
};

/** @return {string} */
context.Name.prototype.oString = function() {
  var self = this;
  return '[' + self._pkg + ':' + self._id + ']';
};
/*
package name.
*/

/**
 * @param {string} pkg
 * @constructor
 */
context.Package = function(pkg) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._pkg = pkg;
};
context.Package.prototype._classname = 'context.Package';

/** @return {boolean} */
context.Package.prototype.empty = function() {
  var self = this;
  return !self._pkg;
};

/**
 * @param {string} id
 * @return {string}
 */
context.Package.prototype.fullname = function(id) {
  var self = this;
  return (self._pkg ? self._pkg + '.' : '') + id;
};

/**
 * @param {string} str
 * @return {string}
 */
context.Package.prototype.replace = function(str) {
  var self = this;
  var pkg;
  pkg = self._pkg;
  // up package reference if there are two or more "%"s.
  while (/^\%\%/.test(str)) {
    if (pkg) {
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
  function(_, connector) {
    return pkg ? pkg + connector : '';
  });
};

/**
 * @param {string} str
 * @return {string}
 */
context.Package.prototype.replace_str = function(str) {
  var self = this;
  return str.replace(/\%+(\:\:|\.)/g, 
  /** @param {string} ref */
  function(ref) {
    return self.replace(ref);
  });
};

/** @return {string} */
context.Package.prototype.toString = function() {
  var self = this;
  return self._pkg;
};
/** @constructor */
output.Block = function() {
  var self = this;
  /**
   * @type {Array.<output.Line>}
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
output.Block.prototype._classname = 'output.Block';
/** @type {string?} */
output.Block.prototype.suffix;
output.Block.prototype.__defineGetter__('suffix', function() {
return this._suffix;
});
output.Block.prototype.__defineSetter__('suffix', function(value) {
this._suffix = value;
});

/** @param {output.Line} line */
output.Block.prototype.append_line = function(line) {
  var self = this;
  self._lines.push(line);
};

/** @type {boolean} */
output.Block.prototype.is_empty;
output.Block.prototype.__defineGetter__('is_empty', function() {
  var self = this;
  return !self._lines.length && !self._suffix;
});

/*
inserts the suffix line to the array passed as a parameter.
*/
/**
 * @param {Array.<string>} lines
 * @private
 */
output.Block.prototype._add_suffix = function(lines) {
  var self = this;
  // find the last non-blank line.
  var last_nonblank;
  last_nonblank = -1;
  lines.forEach(
  /**
   * @param {string} line
   * @param {number} i
   */
  function(line, i) {
    if (line) {
      last_nonblank = i;
    }
  });
  if (last_nonblank < 0) {
    lines.unshift(self._suffix);
  }
  else {
    lines.splice(last_nonblank + 1, 0, self._suffix);
  }
};

/** @type {Array.<string>} */
output.Block.prototype.output;
output.Block.prototype.__defineGetter__('output', function() {
  var self = this;
  var lines;
  lines = self._lines.reduce(
  /**
   * @param {Array.<string>} prev
   * @param {output.Line} line
   * @param {number} i
   */
  function(prev, line, i) {
    return prev.concat(line.output);
  }, []);
  if (self._suffix) {
    self._add_suffix(lines);
  }
  return lines;
});
/*
Output lines corresponds to one input line.
*/

/**
 * @param {InputLine} input
 * @constructor
 */
output.Line = function(input) {
  var self = this;
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
   * @type {Array.<output.Block|string>}
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
output.Line.prototype._classname = 'output.Line';
/** @type {number} */
output.Line.prototype.indent;
output.Line.prototype.__defineGetter__('indent', function() {
return this._indent;
});
output.Line.prototype.__defineSetter__('indent', function(value) {
this._indent = value;
});
/** @type {string} */
output.Line.prototype.line_prefix;
output.Line.prototype.__defineGetter__('line_prefix', function() {
return this._line_prefix;
});
output.Line.prototype.__defineSetter__('line_prefix', function(value) {
this._line_prefix = value;
});
/** @type {string} */
output.Line.prototype.line_suffix;
output.Line.prototype.__defineGetter__('line_suffix', function() {
return this._line_suffix;
});
output.Line.prototype.__defineSetter__('line_suffix', function(value) {
this._line_suffix = value;
});
/** @type {Array.<string>} */
output.Line.prototype.tail_comment;
output.Line.prototype.__defineGetter__('tail_comment', function() {
return this._tail_comment;
});
output.Line.prototype.__defineSetter__('tail_comment', function(value) {
this._tail_comment = value;
});

/** @param {string} line */
output.Line.prototype.append_prefix_line = function(line) {
  var self = this;
  self._prefix_lines.push(line);
};

/** @param {string} line */
output.Line.prototype.append_line = function(line) {
  var self = this;
  self._lines.push(line);
};

/** @param {output.Block} block */
output.Line.prototype.append_block = function(block) {
  var self = this;
  self._lines.push(block);
};

/** @param {Array.<string>} lines */
output.Line.prototype.append_lines = function(lines) {
  var self = this;
  lines.forEach(
  /** @param {string} line */
  function(line) {
    self._lines.push(line);
  });
};

output.Line.prototype.remove_empty_lines = function() {
  var self = this;
  self._lines = self._lines.filter(
  /** @param {output.Block|string} line */
  function(line) {
    return line;
  });
};

/** @type {Array.<string>} */
output.Line.prototype.output;
output.Line.prototype.__defineGetter__('output', function() {
  var self = this;
  var result;
  result = [];
  var indent;
  indent = whitespaces(self._indent);
  self._prefix_lines.forEach(
  /** @param {string} line */
  function(line) {
    result.push(line ? indent + line : '');
  });
  self._lines.forEach(
  /**
   * @param {string|output.Block} line
   * @param {number} i
   */
  function(line, i) {
    if (line instanceof output.Block) {
      result = result.concat(line.output);
    }
    else {
      var to_add;
      to_add = line;
      if (i == 0 && self._line_prefix) {
        to_add = self._line_prefix + to_add;
      }
      if (i == self._lines.length - 1 && self._line_suffix) {
        to_add += self._line_suffix;
      }
      if (to_add) {
        to_add = indent + to_add;
      }
      result.push(to_add);
    }
  });
  self._tail_comment.forEach(
  /** @param {string} c */
  function(c) {
    result.push(indent + c);
  });
  return result;
});
/*
Use PEGJS syntax to create a TokenList.
Container and interface of the TokenList to the rest of the converter.
*/

/**
 * @param {parser.TokenList} tokens
 * @param {!Array.<!InputLine>} input
 * @constructor
 */
parser.Result = function(tokens, input) {
  var self = this;
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
  var self = this;
  return self._tokens.list;
});

/** @type {Array.<string>} */
parser.Result.prototype.prev_lines;
parser.Result.prototype.__defineGetter__('prev_lines', function() {
  var self = this;
  return self._tokens.prev_lines;
});

/** @type {Array.<string>} */
parser.Result.prototype.next_lines;
parser.Result.prototype.__defineGetter__('next_lines', function() {
  var self = this;
  return self._tokens.next_lines;
});

/** @type {Array.<string>} */
parser.Result.prototype.tail_comment;
parser.Result.prototype.__defineGetter__('tail_comment', function() {
  var self = this;
  return self._tokens.next_lines;
});

/** @return {Array.<string>} */
parser.Result.prototype.rendered = function() {
  var self = this;
  var lines;
  lines = [];
  self._tokens.prev_lines.map(
  /** @param {parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  var code_line;
  code_line = self._tokens.toString();
  if (code_line) {
    lines.push(code_line);
  }
  self._tokens.next_lines.map(
  /** @param {parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  return lines;
};
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
parser.Target = function(rule) {
  var self = this;
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
parser.Target.prototype.run = function(input, opt_xformer, show_error_line) {
  var self = this;
  /**
   * @type {LineTransformer}
   * @private
   */
  this._xformer = opt_xformer === undefined ? (null) : opt_xformer;
  if (!(input instanceof Array)) {
    input = [new InputLine(input, 0)];
  }

  var lines;
  lines = input.map(
  /** @param {InputLine} input */
  function(input) {
    return input.line;
  }).join('\n');
  try {
    var result;
    result = _parser.parse(lines, self._rule);
  }
  catch (e) {
    if (show_error_line) {
      // TODO: make this display multi-line right.
      console.error('[FAIL] error for ' + self._rule);
      console.error('I: ' + lines);
      var sp;
      sp = '   ';
      var i;
      i = 0;
      for (; i < e.offset; i++) {
        sp += ' ';
      }
      console.error(sp + '^');
      console.error('E: ' + e);
    }
    return null;
  }
  var b;
  b = new parser.TokenListBuilder(result);
  b.xformer = self._xformer;
  return b.result(input);
};
/**
 * @param {string} type
 * @constructor
 */
parser.BlockMarker = function(type) {
  var self = this;
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
parser.BlockMarker.prototype.toString = function() {
  var self = this;
  return '|#' + self._type + '|';
};


/**
 * @param {parser.TokenList=} orig
 * @constructor
 */
parser.TokenList = function(orig) {
  var self = this;
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
  var self = this;
  if (self._prev_lines.length || self._next_lines.length) {
    return false;
  }
  if (!self._list.length) {
    return true;
  }
  if (self._list.length >= 2) {
    return false;
  }
  return !(self._list[0] instanceof parser.BlockMarker) && self._list[0] == '';
});

/**
 * @param {...*} args
 * @return {parser.TokenList}
 */
parser.TokenList.prototype.add = function(args) {
  var self = this;
  var i;
  i = 0;
  for (; i < arguments.length; i++) {
    var arg;
    arg = arguments[i];

    // Recursive cases.
    if (arg instanceof parser.TokenList) {
      arg.list.forEach(
      /** @param {parser.BlockMarker|string} token */
      function(token) {
        self.add(token);
      });
      arg.prev_lines.forEach(
      /** @param {string} l */
      function(l) {
        self._prev_lines.push(l);
      });
      arg.next_lines.forEach(
      /** @param {string} l */
      function(l) {
        self._next_lines.push(l);
      });
      continue;
    }
    if (arg instanceof Array) {
      arg.forEach(
      /** @param {Array} token */
      function(token) {
        self.add(token);
      });
      continue;
    }

    // Always append a marker.
    if (arg instanceof parser.BlockMarker) {
      self._list.push(arg);
      continue;
    }

    // Should be a string. Append only if we can't add to the last element.
    var last;
    last = self._list.length - 1;
    if (!self._list.length || self._list[last] instanceof parser.BlockMarker) {
      self._list.push(arg);
      continue;
    }
    self._list[last] += arg;
  }
  return self;
};

/**
 * @param {parser.TokenList|string} line
 * @return {parser.TokenList}
 */
parser.TokenList.prototype.prepend = function(line) {
  var self = this;
  if (line instanceof parser.TokenList) {
    self._prev_lines = self._prev_lines.concat(line.prev_lines);
    self._next_lines = self._next_lines.concat(line.next_lines);
  }
  self._prev_lines.push(line.toString());
  return self;
};

/** @param {parser.TokenList|string} line */
parser.TokenList.prototype.append = function(line) {
  var self = this;
  if (line instanceof parser.TokenList) {
    self._prev_lines = self._prev_lines.concat(line.prev_lines);
    self._next_lines = self._next_lines.concat(line.next_lines);
  }
  self._next_lines.push(line.toString());
  return self;
};

/** @return {string} */
parser.TokenList.prototype.toString = function() {
  var self = this;
  return self._list.join('');
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
parser.ParamLine = function(name, is_member, access, type, marker, init) {
  var self = this;
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
parser.ParamLine.prototype = Object.create(parser.TokenList.prototype);
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
parser.ParamLine.prototype.toString = function() {
  var self = this;
  var list;
  list = [
    self._is_member ? '@' : '',
    self._name,
    self._access,
    self._type,
    self._marker
  ];
  var init_str;
  init_str = self._init.toString();
  if (init_str) {
    list.push(' ' + init_str);
  }
  return list.join('');
};
/**
 * @param {parser.TokenList|Array|Object|string} parsed
 * @param {LineTransformer=} opt_xformer
 * @constructor
 */
parser.TokenListBuilder = function(parsed, opt_xformer) {
  var self = this;
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
parser.TokenListBuilder.prototype.build = function() {
  var self = this;
  if (!self._tokens) {
    self._tokens = new parser.TokenList();
    self._build_rec(self._parsed);
  }
  return self._tokens;
};

/**
 * @param {!Array.<InputLine>} input
 * @return {parser.Result}
 */
parser.TokenListBuilder.prototype.result = function(input) {
  var self = this;
  self.build();
  return new parser.Result(self._tokens, input);
};

/**
 * @param {parser.TokenList|Array|Object|string} data
 * @private
 */
parser.TokenListBuilder.prototype._build_rec = function(data) {
  var self = this;
  if (data instanceof parser.TokenList) {
    self._add_tokens(data);
    return;
  }

  if (data instanceof Array) {
    self._add_array(data);
    return;
  }

  if (data instanceof Object) {
    self._add_object(data);
    return;
  }

  // Must be a string.
  if (data) {
    self._tokens.add(data);
  }
};

/**
 * @param {parser.TokenList} data
 * @private
 */
parser.TokenListBuilder.prototype._add_tokens = function(data) {
  var self = this;
  self._tokens.add(data);
};

/**
 * @param {Array} data
 * @private
 */
parser.TokenListBuilder.prototype._add_array = function(data) {
  var self = this;
  data.forEach(
  /** @param {parser.TokenList|Array|Object|string} elem */
  function(elem) {
    self._build_rec(elem);
  });
};

/**
 * @param {Object} data
 * @private
 */
parser.TokenListBuilder.prototype._add_object = function(data) {
  var self = this;
  if (data.g) {
    var p;
    p = data.params;
    switch (data.g) {
      case 'c':;
      var str;
      str = p['percents'] + '.' + p.name;
      self._tokens.add(self.xformer ? self.xformer.pkg_ref(str) : str);
      break;

      case 'e':;
      self._tokens.add(self.xformer ? self.xformer.parent_call(
        new parser.TokenListBuilder(p.args, self.xformer).build().toString()
      ) : ['%(', p.args, ')']);
      break;

      case 'm':;
      self._tokens.add(new parser.BlockMarker(p.type));
      break;

      case 'p':;
      var t;
      t = self._tokens;
      self._tokens = new parser.ParamLine(
        p.name,
        p.member,
        p.access,
        new parser.ParamLineBuilder(p.type, self.xformer).build().toString(),
        p.marker,
        new parser.TokenListBuilder(p.init, self.xformer).build()
      );
      self._tokens.add(t);
      break;

      case 's':;
      self._tokens.grammar = 's';
      break;

      case 't':;
      self.add_type_object(p);
      break;
    }
  }

  if (data.t) {
    self._tokens.add(new parser.TokenListBuilder(data.t, self.xformer).build());
  }
  if (data.p) {
    self._tokens.prepend(new parser.TokenListBuilder(data.p, self.xformer).build());
  }
  if (data.a) {
    self._tokens.append(new parser.TokenListBuilder(data.a, self.xformer).build());
  }
};

/** @param {Object} params */
parser.TokenListBuilder.prototype.add_type_object = function(params) {
  var self = this;
  self._tokens.add(self.xformer ? self.xformer.cast(params.type) : params.tokens);
};


/**
 * @param {parser.TokenList|Array|Object|string} parsed
 * @param {LineTransformer=} xformer
 * @constructor
 * @extends {parser.TokenListBuilder}
 */
parser.ParamLineBuilder = function(parsed, xformer) {
  var self = this;
  parser.TokenListBuilder.call(this, parsed, xformer);
};
parser.ParamLineBuilder.prototype = Object.create(parser.TokenListBuilder.prototype);
parser.ParamLineBuilder.prototype._classname = 'parser.ParamLineBuilder';

/** @param {Object} params */
parser.ParamLineBuilder.prototype.add_type_object = function(params) {
  var self = this;
  self._tokens.add(self.xformer ? self.xformer.type(params.type) : params.tokens);
};
/**
 * @param {FileScope} scope
 * @constructor
 */
section.Generator = function(scope) {
  var self = this;
  /**
   * @type {FileScope}
   * @private
   */
  this._scope = scope;
};
section.Generator.prototype._classname = 'section.Generator';

/**
 * @param {InputLine} header
 * @param {Array.<InputLine>} lines
 * @return {section.Code}
 */
section.Generator.prototype.generate = function(header, lines) {
  var self = this;
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
  function(method) {
    section = self[method].call(self, header_line, header);
    if (section) {
      section.lines = lines;
      section.close(self._scope.context.pkg);
      section.set_type(self._scope.types);
    }
    return !!section;
  })) {
    warn(header, 'line starts with colon and not a code section marker');
  }
  return section;
};

/**
 * @param {string} line
 * @return {section.Constructor}
 * @private
 */
section.Generator.prototype._create_ctor = function(line) {
  var self = this;
  var re;
  re = /^\:\s*(\w+)\s*(\<\s*(.*\S))?$/.exec(line);
  if (!re) {
    return null;
  }

  // need to keep this in a member var too.
  self._scope.context.cls = new context.Class();
  var ctor;
  ctor = new section.Constructor(self._scope.copy_context_with_name(re[1]), re[3]);
  self._scope.context.cls.ctor = ctor;
  self._scope.types.add_ctor(ctor.name());
  if (re[3]) {
    self._scope.types.set_parent(ctor.parent_name());
  }
  return ctor;
};

/**
 * @param {string} line
 * @param {InputLine} header
 * @return {section.Method}
 * @private
 */
section.Generator.prototype._create_method = function(line, header) {
  var self = this;
  var re;
  re = /^(\<?)(\@?)\s*([a-zA-Z]\w*)\s*(\\(.*)\\)?$/.exec(line);
  if (!re) {
    return null;
  }

  // we should have seen a ctor.
  if (!self._scope.context.cls) {
    warn(header, 'method marker w/o class');
    return null;
  }
  return new section.Method(
      self._scope.copy_context(self._scope.context.cls.method_name((re[2] ? '_' : '') + re[3])),
      re[5],
      !!re[1]
  );
};

/**
 * @param {string} line
 * @param {InputLine} header
 * @return {section.Accessor}
 * @private
 */
section.Generator.prototype._create_accessor = function(line, header) {
  var self = this;
  var re;
  re = /^([+*])\s*([a-zA-Z]\w*)\s*(\\(.*)\\)?$/.exec(line);
  if (!re) {
    return null;
  }

  // we should have seen a ctor.
  if (!self._scope.context.cls) {
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
  ctx = self._scope.copy_context(self._scope.context.cls.method_name(name));
  return new section.Accessor(ctx, name, ret_type, type == '+');
};

/**
 * @param {string} line
 * @return {section.Function}
 * @private
 */
section.Generator.prototype._create_global_function = function(line) {
  var self = this;
  var re;
  re = /^=\s*(\w+)\s*##(\\(.*)\\)?$/.exec(line);
  if (!re) {
    return null;
  }
  return new section.Function(self._scope.copy_context_with_name(re[1]), re[3]);
};

/**
 * @param {string} line
 * @return {section.Str}
 * @private
 */
section.Generator.prototype._create_multi_line_str = function(line) {
  var self = this;
  var re;
  re = /^'\s*(\w+)$/.exec(line);
  if (!re) {
    return null;
  }
  return new section.Str(self._scope.copy_context_with_name(re[1]));
};

/**
 * @param {string} line
 * @return {section.Global}
 * @private
 */
section.Generator.prototype._create_global_code = function(line) {
  var self = this;
  return line == '' ? new section.Global() : null;
};

/**
 * @param {string} line
 * @return {section.Native}
 * @private
 */
section.Generator.prototype._create_native_code = function(line) {
  var self = this;
  return line == '~' ? new section.Native() : null;
};

/**
 * @param {string} line
 * @return {section.Scope}
 * @private
 */
section.Generator.prototype._create_anonymous_scope = function(line) {
  var self = this;
  return line == '{' ? new section.Scope() : null;
};

/**
 * @param {string} line
 * @return {section.Typedef}
 * @private
 */
section.Generator.prototype._create_typedef = function(line) {
  var self = this;
  var re;
  re = /^\!\s*(\w+)$/.exec(line);
  if (!re) {
    return null;
  }
  return new section.Typedef(self._scope.copy_context_with_name(re[1]));
};
/** @constructor */
section.Head = function() {
  var self = this;
  /**
   * @type {Array.<IndentBlock>}}
   * @private
   */
  this._blocks = ([]);
};
section.Head.prototype._classname = 'section.Head';
/** @type {Array.<IndentBlock>}} */
section.Head.prototype.blocks;
section.Head.prototype.__defineGetter__('blocks', function() {
return this._blocks;
});

/** @param {IndentBlock} block */
section.Head.prototype.add_block = function(block) {
  var self = this;
  self._blocks.push(block);
};

/** @return {number} */
section.Head.prototype.num_blocks = function() {
  var self = this;
  return self._blocks.length;
};

/**
 * @param {number} index
 * @return {IndentBlock}
 */
section.Head.prototype.block = function(index) {
  var self = this;
  return self._blocks[index];
};

/** @return {IndentBlock} */
section.Head.prototype.last_block = function() {
  var self = this;
  return self._blocks[self._blocks.length - 1];
};

/*
do all the work necessary to produce code output.
*/
section.Head.prototype.transform = function() {
var self = this;
};
  var CODE_PARSER;
  CODE_PARSER = null;

/**
 * @param {!context.Context} context
 * @param {InputLine} input
 * @param {LineParser} line_parsed
 * @constructor
 * @extends {section.Head}
 */
var CodeLine = function(context, input, line_parsed) {
  var self = this;
  /**
   * @type {!context.Context}
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
  section.Head.call(this);
};
CodeLine.prototype = Object.create(section.Head.prototype);
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
  var self = this;
  return self._input.line;
});

/** @type {number} */
CodeLine.prototype.indent;
CodeLine.prototype.__defineGetter__('indent', function() {
  var self = this;
  return self._line_parsed.indent;
});

/** @type {boolean} */
CodeLine.prototype.is_continuation;
CodeLine.prototype.__defineGetter__('is_continuation', function() {
  var self = this;
  return self._line_parsed.is_continuation;
});

/** @type {boolean} */
CodeLine.prototype.is_block_statement;
CodeLine.prototype.__defineGetter__('is_block_statement', function() {
  var self = this;
  return self._matcher.is_block_statement;
});

/** @type {parser.Result} */
CodeLine.prototype.parsed;
CodeLine.prototype.__defineGetter__('parsed', function() {
  var self = this;
  if (self.is_continuation) {
    warn(self._input, 'parse requested for cont. line');
  }
  if (!self._parsed) {
    CODE_PARSER = CODE_PARSER || new parser.Target('ParseLine');
    self._parsed = CODE_PARSER.run(
      [self._input].concat(self._continue_lines),
      new LineTransformer(self._context, self._input),
      true
    );
  }
  return self._parsed;
});

CodeLine.prototype.transform = function() {
  var self = this;
  var code;
  code = (self._param && self._param !== true && self._param.value_line) || self.parsed.code;

  self._matcher = new BlockMatcher(self._context, self._input, code, self.blocks);
  self._matcher.transform();
};

/** @return {output.Line} */
CodeLine.prototype.output = function() {
  var self = this;
  var out;
  out = new output.Line(self._input);
  if (self._param === true) {
    return out;
  }

  out.append_lines(self.parsed.prev_lines.map(
  /** @param {string} line */
  function(line) {
    return line + ';';
  }));
  out.append_lines(self._matcher.first_line());
  self._matcher.each_fragment(
  /**
   * @param {IndentBlock} block
   * @param {Array.<string>} tail_code
   */
  function(block, tail_code) {
    out.append_block(block.output());
    out.append_lines(tail_code);
  });
  if (self._param) {
    self._param.output_init(out);
  }
  self.parsed.tail_comment.forEach(
  /** @param {string} comment */
  function(comment) {
    out.tail_comment.push(comment);
  });
  return out;
};
/**
 * @constructor
 * @extends {section.Head}
 */
section.Code = function() {
  var self = this;
  /**
   * @type {Array.<InputLine>}
   * @private
   */
  this._lines = ([]);
  section.Head.call(this);
};
section.Code.prototype = Object.create(section.Head.prototype);
section.Code.prototype._classname = 'section.Code';
/** @type {Array.<InputLine>} */
section.Code.prototype.lines;
section.Code.prototype.__defineGetter__('lines', function() {
return this._lines;
});
section.Code.prototype.__defineSetter__('lines', function(value) {
this._lines = value;
});

/*
abstract method.
*/
/** @param {!context.Package=} pkg */
section.Code.prototype.close = function(pkg) {
 var self = this;
};

/** @param {TypeSet} types */
section.Code.prototype.set_type = function(types) {
  var self = this;
};
/**
 * @constructor
 * @extends {section.Code}
 */
section.Native = function() {
  var self = this;
  section.Code.call(this);
};
section.Native.prototype = Object.create(section.Code.prototype);
section.Native.prototype._classname = 'section.Native';

/** @return {Array.<output.Line>} */
section.Native.prototype.output = function() {
  var self = this;
  return self.lines.map(
  /** @param {InputLine} line */
  function(line) {
    var out;
    out = new output.Line(line);
    out.append_line(line.trim);
    return out;
  });
};
/**
 * @constructor
 * @extends {section.Code}
 */
section.Runnable = function() {
  var self = this;
  section.Code.call(this);
};
section.Runnable.prototype = Object.create(section.Code.prototype);
section.Runnable.prototype._classname = 'section.Runnable';

/** @override */
section.Runnable.prototype.close = function(pkg) {
  var self = this;
  var c;
  c = new CodeScope(new context.Context(pkg || new context.Package('')), self);
  c.process(self.lines);
};

/** @override */
section.Runnable.prototype.transform = function() {
  var self = this;
  assert(
    self.num_blocks() == 1,
    self.lines[0],
    'Runnable has ' + self.num_blocks() + ' blocks'
  );
  self.block(0).transform();
};

/**
 * @param {string} block_suffix
 * @return {Array.<output.Line>}
 */
section.Runnable.prototype.output_body = function(block_suffix) {
  var self = this;
  var lines;
  lines = [];
  var body_lines;
  body_lines = self.last_block().output();
  if (block_suffix) {
    body_lines.suffix = block_suffix;
  }
  if (!body_lines.is_empty) {
    lines.push(body_lines);
  }
  return lines;
};
/**
 * @param {!context.Context} context
 * @constructor
 * @extends {section.Code}
 */
section.Str = function(context) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {number}
   * @private
   */
  this._indent = (-1);
  section.Code.call(this);
};
section.Str.prototype = Object.create(section.Code.prototype);
section.Str.prototype._classname = 'section.Str';
/** @type {!context.Context} */
section.Str.prototype.context;
section.Str.prototype.__defineGetter__('context', function() {
return this._context;
});

/*
same number of strings as @.lines.
*/
/** @return {Array.<string>} */
section.Str.prototype.strlines = function() {
  var self = this;
  var result;
  result = [];
  self.lines.forEach(
  /** @param {InputLine} line */
  function(line) {
    if (line.is_blank) {
      // empty line is fine.
      result.push('');
      return;
    }
    if (self._indent < 0) {
      self._indent = line.indent;
    }
    else if (line.indent < self._indent) {
      warn(line, 'inconsistent indentation');
      return;
    }
    result.push(line.line.substr(self._indent));
  });
  return result;
};

/** @return {Array.<output.Line>} */
section.Str.prototype.output = function() {
  var self = this;
  var lines;
  lines = self.strlines();
  return [
    self._context.name.decl() + ' =',
    lines.map(
    /**
     * @param {string} line
     * @param {number} i
     */
    function(line, i) {
      var out;
      out = new output.Line(self.lines[i]);
      out.indent = self._indent;
      out.append_line("'" + line + "\\n'" + (i == lines.length - 1 ? ';' : ' +'));
      return out;
    })
  ];
};
/**
 * @param {!context.Context} context
 * @param {string} return_type
 * @constructor
 * @extends {section.Runnable}
 */
section.Callable = function(context, return_type) {
  var self = this;
  /**
   * @type {!context.Context}
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
  section.Runnable.call(this);
};
section.Callable.prototype = Object.create(section.Runnable.prototype);
section.Callable.prototype._classname = 'section.Callable';
/** @type {!context.Context} */
section.Callable.prototype.context;
section.Callable.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {string} */
section.Callable.prototype.return_type;
section.Callable.prototype.__defineGetter__('return_type', function() {
return this._return_type;
});
/** @type {ParamSet} */
section.Callable.prototype.params;
section.Callable.prototype.__defineGetter__('params', function() {
return this._params;
});
section.Callable.prototype.__defineSetter__('params', function(value) {
this._params = value;
});

/** @return {string} */
section.Callable.prototype.name = function() {
  var self = this;
  return self._context.name.ref();
};

/** @override */
section.Callable.prototype.close = function(pkg) {
  var self = this;
  var c;
  c = new CodeScope(self._context, self);
  c.process(self.lines);
};

/** @override */
section.Callable.prototype.transform = function() {
  var self = this;
  assert(
    self.num_blocks() == 1,
    self.lines[0],
    'callable takes 1 block -- found ' + self.num_blocks()
  );
  self._params = new ParamSet(self._context, self.block(0));
  self._params.transform();
  self._params.set_return_type(self._return_type);
  self.block(0).transform();
};

/** @return {string} */
section.Callable.prototype.output_func = function() {
  var self = this;
  return self._context.name.decl() + ' = function(' + self._params.output_params() + ') {';
};
/**
 * @constructor
 * @extends {section.Runnable}
 */
section.Global = function() {
  var self = this;
  section.Runnable.call(this);
};
section.Global.prototype = Object.create(section.Runnable.prototype);
section.Global.prototype._classname = 'section.Global';

/** @return {Array} */
section.Global.prototype.output = function() {
  var self = this;
  return self.output_body('');
};
/**
 * @constructor
 * @extends {section.Runnable}
 */
section.Scope = function() {
  var self = this;
  section.Runnable.call(this);
};
section.Scope.prototype = Object.create(section.Runnable.prototype);
section.Scope.prototype._classname = 'section.Scope';

/** @return {Array} */
section.Scope.prototype.output = function() {
  var self = this;
  return ['(function() {', self.output_body('})();')];
};
/**
 * @param {!context.Context} context
 * @constructor
 * @extends {section.Str}
 */
section.Typedef = function(context) {
  var self = this;
  section.Str.call(this, context);
};
section.Typedef.prototype = Object.create(section.Str.prototype);
section.Typedef.prototype._classname = 'section.Typedef';

/** @return {Array.<output.Line>} */
section.Typedef.prototype.output = function() {
  var self = this;
  var decoder;
  decoder = new TypeDecoder(self.context.pkg, self.strlines().join(''));
  var out;
  out = new output.Line(self.lines[0]);
  out.indent = 0;
  out.append_lines([
    doc_lines(['@typedef {' + decoder.output() + '}']),
    self.context.name.decl() + ';'
  ]);
  return [out];
};
/*
Overriding accessor.
*/

/**
 * @param {!context.Context} context
 * @param {string} name
 * @param {string} return_type
 * @param {boolean} is_getter
 * @constructor
 * @extends {section.Callable}
 */
section.Accessor = function(context, name, return_type, is_getter) {
  var self = this;
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
  section.Callable.call(this, context, return_type);
};
section.Accessor.prototype = Object.create(section.Callable.prototype);
section.Accessor.prototype._classname = 'section.Accessor';

/** @return {Array} */
section.Accessor.prototype.output = function() {
  var self = this;
  var member;
  member = self.context.cls.member(self._name);
  // TODO: error if there is member and we have param or return type specified to the
  // accessor.
  // TODO: error if there is no member, but there are both getter and setter, and their param
  // and return type do not match. also error if the setter takes more than one param.
  if (!member) {
    // accessor with no corresponding member. use the given param and return types.
    member = self.context.cls.add_member(
      self._name,
      new TypeDecoder(self.context.pkg, self.return_type),
      '&',
      true
    );
  }
  var class_name;
  class_name = self.context.cls.name();
  return [
    member.output_decl(class_name),
    member.output_accessor(class_name, self._is_getter, [
      whitespaces(self.block(0).indent) + 'var self = this;',
      self.output_body('')
    ], self.params)
  ];
};
/**
 * @param {!context.Context} context
 * @param {string?=} opt_parent
 * @constructor
 * @extends {section.Callable}
 */
section.Constructor = function(context, opt_parent) {
  var self = this;
  /**
   * @type {string?}
   * @private
   */
  this._parent = opt_parent === undefined ? (null) : opt_parent;
  context.is_ctor = true;
  section.Callable.call(this, context, '');
  self._parent = self._parent ? self.context.pkg.replace(self._parent) : '';
};
section.Constructor.prototype = Object.create(section.Callable.prototype);
section.Constructor.prototype._classname = 'section.Constructor';

/** @return {string} */
section.Constructor.prototype.parent_name = function() {
  var self = this;
  return /** @type {string} */(self._parent);
};

/** @override */
section.Constructor.prototype.transform = function() {
  var self = this;
  assert(self.num_blocks() == 1, self.lines[0]);
  self.params = new ParamSet(self.context, self.block(0), true);
  self.params.transform();
  self.block(0).transform();
};

/** @return {Array} */
section.Constructor.prototype.output = function() {
  var self = this;
  var decl;
  decl = self.params.output_decls();
  decl.push('@constructor');
  var inherit;
  inherit = [];
  if (self._parent) {
    decl.push('@extends {' + self._parent + '}');
    inherit.push([
      self.context.name.ref(),
      '.prototype = Object.create(',
      self._parent,
      '.prototype);'
    ].join(''));
  }
  return [
    doc_lines(decl),
    self.output_func(),
    whitespaces(self.block(0).indent) + 'var self = this;',
    self.output_body('};'),
    inherit,
    [
      self.context.name.property('_classname').decl(),
      " = '",
      self.context.name.ref(),
      "';"
    ].join(''),
    self.context.cls.output_accessors()
  ];
};

/** @override */
section.Constructor.prototype.set_type = function(types) {
  var self = this;
  self.params.set_argtypes(types.get_current_ctor());
};
/**
 * @param {!context.Context} context
 * @param {string} return_type
 * @constructor
 * @extends {section.Callable}
 */
section.Function = function(context, return_type) {
  var self = this;
  section.Callable.call(this, context, return_type);
};
section.Function.prototype = Object.create(section.Callable.prototype);
section.Function.prototype._classname = 'section.Function';

/** @return {Array} */
section.Function.prototype.output = function() {
  var self = this;
  return [
    doc_lines(self.params.output_decls()),
    self.output_func(),
    self.output_body('};')
  ];
};

/** @override */
section.Function.prototype.set_type = function(types) {
  var self = this;
  self.params.set_argtypes(types.add_funct(self.context.name.ref()));
};
/**
 * @param {!context.Context} context
 * @param {string} return_type
 * @param {boolean} overriding
 * @constructor
 * @extends {section.Callable}
 */
section.Method = function(context, return_type, overriding) {
  var self = this;
  /**
   * @type {boolean}
   * @private
   */
  this._overriding = overriding;
  context.is_method = true;
  section.Callable.call(this, context, return_type);
};
section.Method.prototype = Object.create(section.Callable.prototype);
section.Method.prototype._classname = 'section.Method';

/** @return {Array} */
section.Method.prototype.output = function() {
  var self = this;
  var decls;
  decls = [];
  if (self._overriding) {
    decls = ['@override'];
  }
  else {
    decls = self.params.output_decls();
  }
  if (/^_/.test(self.context.name.id)) {
    decls.push('@private');
  }
  return [
    doc_lines(decls),
    self.output_func(),
    whitespaces(self.block(0).indent) + 'var self = this;',
    self.output_body('};')
  ];
};

/** @override */
section.Method.prototype.set_type = function(types) {
  var self = this;
  self.params.set_argtypes(
    types.get_current_ctor().add_method(self.context.name.id)
  );
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
      basedir = opt_param;
    }
    else if (opt_name == 'sort') {
      mode = ExecModes.SORT;
    }
    else if (opt_name == 'argtypes') {
      mode = ExecModes.ARGTYPE;
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
    compile_files(basedir, inout_filenames);
    break;

    case ExecModes.SORT:;
    var list;
    list = create_sorted_list(inout_filenames);
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
    create_argtypes(basedir, inout_filenames);
    break;
  }
  process.exit(0);
