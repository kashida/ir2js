var context = {};
var input = {};
var output = {};
var parser = {};
var section = {};
var type = {};

  var _fs;
  _fs = require('fs');
  var _path;
  _path = require('path');
  var _util;
  _util = require('util');
  var _parser;
  _parser = require('./syntax');
/*
Making closure compiler think we are doing inheritance (it doesn't seem to
understand Object.create).
Specifically, child class with @struct doesn't see parent's @struct unless we
use this.
*/
  var goog;
  goog = goog || {};
  goog.inherits = 
  /**
   * @param {Object} childCtor
   * @param {Object} parentCtor
   */
  function(childCtor, parentCtor) {
    childCtor.prototype = Object.create(parentCtor.prototype);
  };
/*
Match markers and blocks.
*/

/**
 * @param {!context.Context} context
 * @param {input.Line} input
 * @param {Array.<!parser.BlockMarker|string>} code
 * @param {Array.<!IndentBlock>} blocks
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var BlockMatcher = function(context, input, code, blocks) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;
  /**
   * @type {Array.<!parser.BlockMarker|string>}
   * @private
   */
  this._code = code;
  /**
   * @type {Array.<!IndentBlock>}
   * @private
   */
  this._blocks = blocks;
  /**
   * @type {Array.<!ParamSet>}
   * @private
   */
  this._params = ([]);
  /**
   * @type {boolean}
   * @private
   */
  this._isBlockStatement = (false);
};
BlockMatcher.prototype._classname = 'BlockMatcher';
/** @type {boolean} */
BlockMatcher.prototype.isBlockStatement;
BlockMatcher.prototype.__defineGetter__('isBlockStatement', function() {
return this._isBlockStatement;
});

BlockMatcher.prototype.transform = function() {
  var self = this;
  self._matchBlocks();
  self._transformBlocks();
};

/*
Returns true only if matching succeeds.
*/
/** @private */
BlockMatcher.prototype._matchBlocks = function() {
  var self = this;
  var itr;
  itr = new CodeBlockItr(self._input, self._code, self._blocks);
  itr.blockCb = 
  /**
   * @param {string} type
   * @param {boolean} with_param
   */
  function(type, with_param) {
    if (with_param) {
      var sub_context;
      sub_context = self._context.clone();
      sub_context.isFileScope = false;
      var param;
      param = new ParamSet(sub_context, self._blocks[itr.bidx]);
      self._params.push(param);
    }
  };
  itr.run();
  self._isBlockStatement = itr.isBlockStatement;
};

/** @private */
BlockMatcher.prototype._transformBlocks = function() {
  var self = this;
  var itr;
  itr = new CodeBlockItr(self._input, self._code, self._blocks);
  itr.blockCb = 
  /**
   * @param {string} type
   * @param {boolean} with_param
   */
  function(type, with_param) {
    // transform the blocks.

    // TODO: Error check number of lines in the block matches the number of
    // line markers.
    // TODO: Error check conditional block marker if the block has exactly
    // 3 lines
    if (type === 'l' && itr.lidx !== 0) {
      // Line marker block gets callback for every line.
      // Only need to transform for the first line.
      return;
    }
    if (with_param) {
      self._params[itr.pidx].transform();
    }
    self._blocks[itr.bidx].transform({
      'b': BlockType.BLOCK,
      'f': BlockType.FUNCTION,
      'o': BlockType.OBJ,
      'a': BlockType.ARRAY,
      'p': BlockType.PARAMS,
      'c': BlockType.COND,
      'l': BlockType.LINE,
      '.': BlockType.DOT,
      '*': BlockType.MULT,
      '+': BlockType.ADD,
      '&&': BlockType.LOG_AND,
      '||': BlockType.LOG_OR
    }[type]);
  };
  itr.run();
};

/** @param {output.Line} out */
BlockMatcher.prototype.output = function(out) {
  var self = this;
  var itr;
  itr = new CodeBlockItr(self._input, self._code, self._blocks);
  itr.blockCb = 
  /**
   * @param {string} type
   * @param {boolean} with_param
   */
  function(type, with_param) {
    var block;
    block = self._blocks[itr.bidx];
    if (with_param) {
      self._outputParams(out, self._params[itr.pidx]);
    }
    out.lines.appendStr(block.startStr);
    out.lines.appendBlock(block.output(type === 'l' ? itr.lidx : undefined));
    out.lines.appendStr(block.endStr);
  };
  itr.codeCb = function() {
    out.lines.appendStr(/** @type {string} */(self._code[itr.cidx]));
  };
  itr.run();
};

/**
 * @param {output.Line} out
 * @param {ParamSet} param
 * @private
 */
BlockMatcher.prototype._outputParams = function(out, param) {
  var self = this;
  if (param.isDeclEmpty()) {
    out.lines.appendStr('function(' + param.outputParams() + ')');
  }
  else {
    // we don't try to merge the frg into first line.
    out.lines.terminateLine();
    out.lines.appendLines(docLines(param.outputDecls()));
    out.lines.appendStr('function(' + param.outputParams() + ')');
  }
};
/**
 * @param {input.Line} input
 * @param {Array.<parser.BlockMarker|string>} code
 * @param {Array.<IndentBlock>} blocks
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var CodeBlockItr = function(input, code, blocks) {
  var self = this;
  /**
   * @type {input.Line}
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
   * @type {?function(string, boolean)}
   * @private
   */
  this._blockCb = (null);
  /**
   * @type {?function()}
   * @private
   */
  this._codeCb = (null);
  /**
   * @type {number}
   * @private
   */
  this._cidx = (0);
  /**
   * @type {number}
   * @private
   */
  this._bidx = (0);
  /**
   * @type {number}
   * @private
   */
  this._lidx = (0);
  /**
   * @type {number}
   * @private
   */
  this._pidx = (0);
  /**
   * @type {boolean}
   * @private
   */
  this._isBlockStatement = (false);
};
CodeBlockItr.prototype._classname = 'CodeBlockItr';
/** @type {?function(string, boolean)} */
CodeBlockItr.prototype.blockCb;
CodeBlockItr.prototype.__defineGetter__('blockCb', function() {
return this._blockCb;
});
CodeBlockItr.prototype.__defineSetter__('blockCb', function(value) {
this._blockCb = value;
});
/** @type {?function()} */
CodeBlockItr.prototype.codeCb;
CodeBlockItr.prototype.__defineGetter__('codeCb', function() {
return this._codeCb;
});
CodeBlockItr.prototype.__defineSetter__('codeCb', function(value) {
this._codeCb = value;
});
/** @type {number} */
CodeBlockItr.prototype.cidx;
CodeBlockItr.prototype.__defineGetter__('cidx', function() {
return this._cidx;
});
/** @type {number} */
CodeBlockItr.prototype.bidx;
CodeBlockItr.prototype.__defineGetter__('bidx', function() {
return this._bidx;
});
/** @type {number} */
CodeBlockItr.prototype.lidx;
CodeBlockItr.prototype.__defineGetter__('lidx', function() {
return this._lidx;
});
/** @type {number} */
CodeBlockItr.prototype.pidx;
CodeBlockItr.prototype.__defineGetter__('pidx', function() {
return this._pidx;
});
/** @type {boolean} */
CodeBlockItr.prototype.isBlockStatement;
CodeBlockItr.prototype.__defineGetter__('isBlockStatement', function() {
return this._isBlockStatement;
});

CodeBlockItr.prototype.run = function() {
  var self = this;
  self._code.forEach(
  /**
   * @param {parser.BlockMarker|string} frg
   * @param {number} i
   */
  function(frg, i) {
    self._cidx = i;
    if (frg instanceof parser.BlockMarker) {
      self._handleMarker(frg);
    }
    else {
      if (self._codeCb) {
        self._codeCb();
      }
    }
  });

  if (self._lidx > 0) {
    self._lidx = 0;
    self._bidx++;
  }

  // There may be one extra block.
  if (self._bidx !== self._blocks.length) {
    error(self._input, (
      ('# of blocks does not match # of markers: ') +
      (self._bidx) +
      (', ') +
      (self._blocks.length)
    ));
  }
};

/**
 * @param {parser.BlockMarker} marker
 * @private
 */
CodeBlockItr.prototype._handleMarker = function(marker) {
  var self = this;
  if (marker.type !== 'l') {
    if (self._lidx > 0) {
      self._lidx = 0;
      self._bidx++;
    }
  }

  if (self._blockCb) {
    self._blockCb(marker.type, marker.type === 'f');
  }

  if (marker.type !== 'l') {
    self._bidx++;
  }
  if (marker.type === 'f') {
    self._pidx++;
  }
  if (marker.type === 'l') {
    self._lidx++;
  }
  if (marker.type === 'b') {
    self._isBlockStatement = true;
  }
};
/**
 * @param {!context.Context} context
 * @param {section.Head} head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
  this._lastValidLine = (null);
  /**
   * @type {Array.<SectionLine>}
   * @private
   */
  this._invalidLines = ([]);
};
CodeParser.prototype._classname = 'CodeParser';

/** @param {Array.<input.Line>} input_lines */
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
 * @param {Array.<input.Line>} input_lines
 * @private
 */
CodeParser.prototype._process = function(input_lines) {
  var self = this;
  var first_line_indent;
  first_line_indent = 0;
  var code_lines;
  code_lines = self._makeCodeLines(input_lines);
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
  self._head.addBlock(self._blocks[0]);

  code_lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    // create blocks and assign lines to them.
    if (line instanceof InvalidLine) {
      self._invalidLines.push(line);
      return;
    }

    var prev_indent;
    prev_indent = self._topBlock().indent;
    var indent;
    indent = line.indent;

    if (indent > prev_indent) {
      self._deeperIndent(i, indent);
    }
    else if (indent < prev_indent) {
      self._shallowerIndent(line, i);
    }

    self._addInvalidLines();
    if (line.isContinuation) {
      self._continuation(line, i);
    }
    else if (line instanceof SeparatorLine) {
      self._separator(line, indent, i);
    }
    else {
      self._lastValidLine = /** @type {CodeLine} */(line);
      self._topBlock().add(line);
    }
  });
  self._addInvalidLines();
  self._popRest();
};

/**
 * @param {Array.<input.Line>} input_lines
 * @return {Array.<SectionLine>}
 * @private
 */
CodeParser.prototype._makeCodeLines = function(input_lines) {
  var self = this;
  var cat;
  cat = new LineCategorizer(self._context);
  return input_lines.map(
  /** @param {input.Line} line */
  function(line) {
    return cat.createLine(line);
  });
};

/**
 * @param {number} i
 * @param {number} indent
 * @private
 */
CodeParser.prototype._deeperIndent = function(i, indent) {
  var self = this;
  // push a new block in the stack.
  var b;
  b = new IndentBlock(i, indent, self._lastValidLine);
  self._lastValidLine.addBlock(b);
  self._blocks.push(b);
};

/**
 * @param {SectionLine} line
 * @param {number} i
 * @private
 */
CodeParser.prototype._shallowerIndent = function(line, i) {
  var self = this;
  // back up levels.
  while (line.indent < self._topBlock().indent) {
    self._blocks.pop();
    assert(
      self._blocks.length >= 1,
      line.input,
      'stack size zero (line ' + (i + 1) + '): ' + line.str
    );
  }
  if (line.indent > self._topBlock().indent) {
    error(line.input, 'indent level does not match');
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
  prev_b.head().addBlock(b);
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
  last_line = self._topBlock().lastLine();
  if (!last_line) {
    error(line.input, 'continuation as a first line of block');
  }
  else {
    last_line.continueLines.push(new input.Line(
      self._context.fileName,
      line.input.line.replace(/\|/, ' '),
      line.input.rowIndex
    ));
  }
  self._lastValidLine = /** @type {CodeLine} */(line);
};

/** @private */
CodeParser.prototype._addInvalidLines = function() {
  var self = this;
  var top_block;
  top_block = self._topBlock();
  self._invalidLines.forEach(
  /** @param {SectionLine} line */
  function(line) {
    top_block.add(line);
  });
  self._invalidLines = [];
};

/** @private */
CodeParser.prototype._popRest = function() {
  var self = this;
  // pop all the rest of blocks except one.
  while (self._blocks.length > 1) {
    self._blocks.pop();
  }
};

/** @private */
CodeParser.prototype._topBlock = function() {
  var self = this;
  // there should be at least the root block.
  return self._blocks[self._blocks.length - 1];
};
/**
 * @param {!context.Context} context
 * @param {section.Head=} opt_head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
CodeScope.prototype.processLines = function(lines) {
  var self = this;
  var i;
  i = 0;
  self.process(lines.map(
  /** @param {string} line */
  function(line) {
    return new input.Line(self._context.fileName, line, i++);
  }));
};

/** @param {Array.<input.Line>} input_lines */
CodeScope.prototype.process = function(input_lines) {
  var self = this;
  new CodeParser(self._context, self._head).parse(input_lines);
  self._head.transform();
};

CodeScope.prototype.output = function() {
  var self = this;
  return arrFlatten(self._head.output()).map(
  /** @param {string} line */
  function(line) {
    return line.replace(/\s*$/, '');
  });
};
/*
parse file scope and separate code sections from comments.
*/
/** @typedef {input.Comment|section.Code} */
var OutputSection;

/**
 * @param {string} file_name
 * @param {string} pkg_name
 * @param {string} defaultClsName
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var FileScope = function(file_name, pkg_name, defaultClsName) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._defaultClsName = defaultClsName;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = (new context.Context(
    file_name,
    new context.Package(pkg_name)
  ));
  /**
   * @type {type.Set}
   * @private
   */
  this._types = (new type.Set());
  /**
   * @type {Array.<OutputSection>}
   * @private
   */
  this._list = (null);

  self._context.isFileScope = true;
};
FileScope.prototype._classname = 'FileScope';
/** @type {!context.Context} */
FileScope.prototype.context;
FileScope.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {type.Set} */
FileScope.prototype.types;
FileScope.prototype.__defineGetter__('types', function() {
return this._types;
});

/** @param {Array.<string>} line */
FileScope.prototype.processLines = function(line) {
  var self = this;
  var gen;
  gen = new section.Generator(self);
  var input_list;
  input_list = new input.File(self._context.fileName, line).parse();
  self._list = input_list.map(
  /**
   * @param {input.Comment|input.Section} section
   * @param {number} index
   */
  function(section, index) {
    // convert input.Section to section.Code and leave input.Comment as is.
    return section instanceof input.Section ? gen.generate(
      section.header,
      section.lines
    ) : section;
  });
};

/**
 * @param {!context.Name} name
 * @return {!context.Context}
 */
FileScope.prototype.copyContext = function(name) {
  var self = this;
  var ctxt;
  ctxt = self._context.clone();
  ctxt.name = name;
  ctxt.cls = self._context.cls;
  ctxt.isFileScope = self._context.isFileScope;
  return ctxt;
};

/**
 * @param {string} name
 * @return {!context.Context}
 */
FileScope.prototype.copyContextWithName = function(name) {
  var self = this;
  var cls_name;
  cls_name = name || self._defaultClsName;
  var fullname;
  fullname = new context.Name(self._context.pkg, cls_name);
  return self.copyContext(fullname);
};

/** @return {Array.<string>} */
FileScope.prototype.output = function() {
  var self = this;
  return arrFlatten(self._list.map(
  /** @param {OutputSection} elem */
  function(elem) {
    return elem.output();
  }));
};
/**
 * @param {number} lineNo
 * @param {number} indent
 * @param {section.Head} head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var IndentBlock = function(lineNo, indent, head) {
  var self = this;
  /**
   * @type {number}
   * @private
   */
  this._lineNo = lineNo;
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
IndentBlock.prototype.lineNo;
IndentBlock.prototype.__defineGetter__('lineNo', function() {
return this._lineNo;
});
/** @type {number} */
IndentBlock.prototype.indent;
IndentBlock.prototype.__defineGetter__('indent', function() {
return this._indent;
});

  // TODO: enum
  var BlockType;
  BlockType = {
    'BLOCK': 0,
    'FUNCTION': 1,
    'OBJ': 2,
    'ARRAY': 3,
    'PARAMS': 4,
    'LINE': 5,
    'COND': 6,
    'DOT': 7,
    'MULT': 8,
    'ADD': 9,
    'LOG_AND': 10,
    'LOG_OR': 11
  };

  var _BLOCK_OPEN;
  _BLOCK_OPEN = [' {', ' {', '{', '[', '(', '(', '(', '(', '(', '(', '(', '('];
  var _LINE_PREFIX;
  _LINE_PREFIX = ['', '', '', '', '', '', '(', '', '(', '(', '(', '('];
  var _LINE_SUFFIX;
  _LINE_SUFFIX = [';', ';', ',', ',', ',', '', ') :', '.', ') *', ') +', ') &&', ') ||'];
  var _FIRST_SUFFIX;
  _FIRST_SUFFIX = [';', ';', ',', ',', ',', '', ') ?', '.', ') *', ') +', ') &&', ') ||'];
  var _END_SUFFIX;
  _END_SUFFIX = [';', ';', '', '', '', '', ')', '', ')', ')', ')', ')'];
  var _BLOCK_CLOSE;
  _BLOCK_CLOSE = ['}', '}', '}', ']', ')', ')', ')', ')', ')', ')', ')', ')'];

/** @param {SectionLine} line */
IndentBlock.prototype.add = function(line) {
  var self = this;
  self._lines.push(line);
};

IndentBlock.prototype.lastLine = function() {
  var self = this;
  return self._lines[self._lines.length - 1];
};

/**
 * @param {function(SectionLine, number)} cb
 * @param {Object} ctxt
 */
IndentBlock.prototype.eachLine = function(cb, ctxt) {
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

/** @type {string} */
IndentBlock.prototype.startStr;
IndentBlock.prototype.__defineGetter__('startStr', function() {
  var self = this;
  // string to open the block.
  return _BLOCK_OPEN[self._marker];
});

/** @type {string} */
IndentBlock.prototype.endStr;
IndentBlock.prototype.__defineGetter__('endStr', function() {
  var self = this;
  return _BLOCK_CLOSE[self._marker];
});

/** @type {boolean} */
IndentBlock.prototype.hasValidLine;
IndentBlock.prototype.__defineGetter__('hasValidLine', function() {
  var self = this;
  return self._lines.some(
  /** @param {SectionLine} line */
  function(line) {
    return !(line instanceof InvalidLine);
  });
});

/**
 * @param {number=} line_index
 * @return {!output.Block}
 */
IndentBlock.prototype.output = function(line_index) {
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
    (
      (last_index >= 0) ||
      (self._marker === BlockType.BLOCK) ||
      (self._marker === BlockType.FUNCTION)
    ),
    self._lines.length ? self._lines[0].input : input.UnknownInputLine,
    'block with no valid lines.'
  );

  var out;
  out = new output.Block();
  var accum_suffix;
  accum_suffix = '';
  var valid_line_count;
  valid_line_count = 0;
  self._lines.forEach(
  /**
   * @param {SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    if (!(line instanceof InvalidLine) && !line.param) {
      valid_line_count++;
    }
    if (line_index !== undefined && line_index + 1 !== valid_line_count) {
      return;
    }
    var out_line;
    out_line = line.output();
    if (line instanceof InvalidLine || out_line.empty) {
      accum_suffix += out_line.lineSuffix;
      out_line.lineSuffix = '';
    }
    else {
      out_line.lineSuffix = accum_suffix + out_line.lineSuffix;
      if (!line.isBlockStatement) {
        out_line.linePrefix += _LINE_PREFIX[self._marker];
        out_line.lineSuffix += (
          i === last_index ? _END_SUFFIX[self._marker] : (
            i === 0 ? _FIRST_SUFFIX[self._marker] : _LINE_SUFFIX[self._marker]
          )
        );
      }
      accum_suffix = '';
    }
    out.appendLine(out_line);
  });
  return out;
};
/*
either blank line or comment only line.
*/
/**
 * @param {input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var InvalidLine = function(input) {
  var self = this;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;
};
InvalidLine.prototype._classname = 'InvalidLine';
/** @type {input.Line} */
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
  out.appendLine(self._input.trim);
  return out;
};
/** @typedef {CodeLine|SeparatorLine|InvalidLine} */
var SectionLine;

/**
 * @param {!context.Context} context
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
 * @param {input.Line} line
 * @return {SectionLine}
 */
LineCategorizer.prototype.createLine = function(line) {
  var self = this;
  var parsed;
  parsed = new LineParser(line);
  if (!parsed.isValid) {
    return new InvalidLine(line);
  }
  if (parsed.isSeparator) {
    return new SeparatorLine(line, parsed);
  }
  return new CodeLine(self._context, line, parsed);
};
/*
First pass line parsing for constructing the block structure.
*/
/**
 * @param {input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var LineParser = function(input) {
  var self = this;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;

  /**
   * @type {boolean}
   * @private
   */
  this._isValid = (false);
  /**
   * @type {number}
   * @private
   */
  this._indent = (0);
  /**
   * @type {boolean}
   * @private
   */
  this._isContinuation = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._isSeparator = (false);

  self._process();
};
LineParser.prototype._classname = 'LineParser';
/** @type {boolean} */
LineParser.prototype.isValid;
LineParser.prototype.__defineGetter__('isValid', function() {
return this._isValid;
});
/** @type {number} */
LineParser.prototype.indent;
LineParser.prototype.__defineGetter__('indent', function() {
return this._indent;
});
/** @type {boolean} */
LineParser.prototype.isContinuation;
LineParser.prototype.__defineGetter__('isContinuation', function() {
return this._isContinuation;
});
/** @type {boolean} */
LineParser.prototype.isSeparator;
LineParser.prototype.__defineGetter__('isSeparator', function() {
return this._isSeparator;
});

/** @private */
LineParser.prototype._process = function() {
  var self = this;
  if (/^\s*$/.test(self._input.line) || /^\s*\/\//.test(self._input.line)) {
    // blank or comment line. Nothing to be done.
    return;
  }
  self._isValid = true;

  self._checkSpaces();
  self._checkContinuation();
  self._checkSeparator();
};

/** @private */
LineParser.prototype._checkSpaces = function() {
  var self = this;
  var spaces_re;
  spaces_re = /^(\s*)(.*[\S])(\s*)$/.exec(self._input.line);

  self._indent = spaces_re[1].length;
  if (!/ */.test(spaces_re[1])) {
    error(self._input, 'non-ascii 0x20 space for indentation');
  }

  if (spaces_re[3] !== '') {
    error(self._input, 'trailing space');
  }
};

/** @private */
LineParser.prototype._checkContinuation = function() {
  var self = this;
  var cont_re;
  cont_re = /^\s*\|/.exec(self._input.line);
  self._isContinuation = !!cont_re;
};

/** @private */
LineParser.prototype._checkSeparator = function() {
  var self = this;
  self._isSeparator = /^\s*--\s*$/.test(self._input.line);
};
/**
 * @param {!context.Context} context
 * @param {input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var LineTransformer = function(context, input) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;
};
LineTransformer.prototype._classname = 'LineTransformer';

/**
 * @param {string} name
 * @return {string}
 */
LineTransformer.prototype.pkgRef = function(name) {
  var self = this;
  // relative package reference.
  return self._context.pkg.replace(name);
};

/**
 * @param {string} type_name
 * @return {string}
 */
LineTransformer.prototype.cast = function(type_name) {
  var self = this;
  return '/** @type {' + new type.Decoder(self._context.pkg, type_name).output() + '} */';
};

/**
 * @param {string} type_name
 * @return {string}
 */
LineTransformer.prototype.type = function(type_name) {
  var self = this;
  return new type.Decoder(self._context.pkg, type_name).output();
};

/**
 * @param {parser.TokenList} args
 * @return {!Array}
 */
LineTransformer.prototype.parentCall = function(args) {
  var self = this;
  var end;
  end = args.isEmpty ? ')' : [', ', args, ')'];
  if (self._context.isCtor) {
    return [self._context.cls.ctor.parentName() + '.call(this', end];
  }
  else if (self._context.isMethod) {
    return [[
      self._context.cls.ctor.parentName(),
      '.prototype.',
      self._context.name.id,
      '.call(this'
    ].join(''), end];
  }
  else {
    error(self._input, 'parent call appeared in non-ctor / non-method.');
    return ['^(', args, ')'];
  }
};
/*
Pseudo member is a place holder for class members that don't exist, but there
are accessors for.
*/
/**
 * @param {string} name
 * @param {type.Decoder} type
 * @param {string} accessType
 * @param {boolean} isPseudo
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var Member = function(name, type, accessType, isPseudo) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {type.Decoder}
   * @private
   */
  this._type = type;
  /**
   * @type {string}
   * @private
   */
  this._accessType = accessType;
  /**
   * @type {boolean}
   * @private
   */
  this._isPseudo = isPseudo;
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
Member.prototype.outputDecl = function(class_name) {
  var self = this;
  if (self._declared) {
    return [];
  }
  self._declared = true;
  // TODO: this member decl always allows setting a value to it even when only the
  // getter is provided.
  return [
    '/** @type {' + self._type.output() + '}' + ' */',
    class_name.property(self._name).decl + ';'
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
Member.prototype.outputAccessor = function(class_name, is_getter, body, params) {
  var self = this;
  var p;
  p = self._isPseudo && params ? params.outputParams() : 'value';
  return [is_getter ? (
    (
      (class_name.property('__defineGetter__').decl) +
      ("('" + self._name + "', function() {")
    )
  ) : (
    (
      (class_name.property('__defineSetter__').decl) +
      ("('" + self._name + "', function(" + p + ') {')
    )
  ), body, '});'];
};

/*
produce necessary accessor methods based on the access type specification.
*/
/**
 * @param {!context.Name} class_name
 * @return {Array}
 */
Member.prototype.outputAccessors = function(class_name) {
  var self = this;
  if (!self._accessType || self._isPseudo) {
    return [];
  }
  var result;
  result = [self.outputDecl(class_name)];
  if ('+&'.indexOf(self._accessType) >= 0) {
    result.push(self.outputAccessor(class_name, true, ['return this._' + self._name + ';']));
  }
  if ('*&'.indexOf(self._accessType) >= 0) {
    result.push(self.outputAccessor(class_name, false, ['this._' + self._name + ' = value;']));
  }
  return result;
};
/*
Function parameter and / or member declarion.
*/
/**
 * @param {!context.Context} context
 * @param {boolean} is_ctor
 * @param {input.Line} inputs
 * @param {parser.Result} parsed
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var Param = function(context, is_ctor, inputs, parsed) {
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
   * @type {type.Decoder}
   * @private
   */
  this._type = (null);
  /**
   * @type {Array.<parser.BlockMarker|string>}
   * @private
   */
  this._valueLine = (null);

  if (!(parsed.tokens instanceof parser.ParamLine)) {
    return;
  }

  self._line = parsed.tokens;
  self._success = true;
  self._type = new type.Decoder(self._context.pkg, self._line.type);

  self._valueLine = self._line.init && !self._line.init.isEmpty ? self._line.init.list : null;
  if (self.isMember && self.initType !== '$' && !self._valueLine) {
    // member with no initializer or optional param init.
    self._valueLine = ['null'];
  }

  // sanity check the param consistency.
  if (!is_ctor && self.isMember) {
    error(inputs, 'member param for non-constructor method');
  }
  if (!self.isMember && self.initType !== '?' && self._valueLine) {
    error(inputs, 'initial value for non-member non-optional');
  }
};
Param.prototype._classname = 'Param';
/** @type {boolean} */
Param.prototype.success;
Param.prototype.__defineGetter__('success', function() {
return this._success;
});
/** @type {type.Decoder} */
Param.prototype.type;
Param.prototype.__defineGetter__('type', function() {
return this._type;
});
/** @type {Array.<parser.BlockMarker|string>} */
Param.prototype.valueLine;
Param.prototype.__defineGetter__('valueLine', function() {
return this._valueLine;
});

/** @type {boolean} */
Param.prototype.isMember;
Param.prototype.__defineGetter__('isMember', function() {
  var self = this;
  return self._line.isMember;
});

/** @type {string} */
Param.prototype.name;
Param.prototype.__defineGetter__('name', function() {
  var self = this;
  return self._line.name;
});

/** @type {string} */
Param.prototype.accessType;
Param.prototype.__defineGetter__('accessType', function() {
  var self = this;
  return self._line.access;
});

/** @type {string} */
Param.prototype.initType;
Param.prototype.__defineGetter__('initType', function() {
  var self = this;
  return self._line.marker;
});

/** @type {boolean} */
Param.prototype.hasInit;
Param.prototype.__defineGetter__('hasInit', function() {
  var self = this;
  return !!self._valueLine;
});

/**
 * @return {string}
 * @private
 */
Param.prototype._paramName = function() {
  var self = this;
  return (self.hasInit ? 'opt_' : '') + self.name;
};

/** @return {string} */
Param.prototype.outputDecl = function() {
  var self = this;
  return self._type && self.initType !== '' ? ([
    '@param {',
    self._type.output(),
    self.initType === '?' ? '=' : '',
    '} ',
    self._paramName()
  ].join('')) : '';
};

/** @return {string} */
Param.prototype.outputParam = function() {
  var self = this;
  return self.initType === '' ? '' : self._paramName();
};

/*
Variable initialization output as first statements of function body.
*/
/** @param {output.Line} out */
Param.prototype.outputInit = function(out) {
  var self = this;
  var pname;
  pname = self._paramName();

  if (!self.isMember && !self.hasInit) {
    return;
  }

  if (self.isMember) {
    out.prefixLines = out.prefixLines.concat(docLines([
      '@type {' + self._type.output() + '}',
      '@private'
    ]));
  }

  out.linePrefix = (
    (self.isMember ? 'this._' : 'var ') +
    (self.name) +
    (' = ')
  );
  if (self.initType) {
    out.linePrefix += pname;
    if (self.hasInit) {
      out.linePrefix += ' === undefined ? (';
      out.lineSuffix = ') : ' + pname;
    }
  }
  else {
    out.linePrefix += '(';
    out.lineSuffix = ')';
  }
};

/** @return {string} */
Param.prototype.outputArgType = function() {
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
 * @param {boolean=} opt_isCtor
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var ParamSet = function(context, block, opt_isCtor) {
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
  this._isCtor = opt_isCtor === undefined ? (false) : opt_isCtor;
  /**
   * @type {Array.<!Param>}
   * @private
   */
  this._params = ([]);
  /**
   * @type {type.Decoder}
   * @private
   */
  this._returnType = (null);
};
ParamSet.prototype._classname = 'ParamSet';

ParamSet.prototype.transform = function() {
  var self = this;
  var param_done;
  param_done = false;
  self._block.eachLine(
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
    if (line instanceof CodeLine && !line.isContinuation) {
      var p;
      p = self._addLine(/** @type {CodeLine} */(line), i);
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
ParamSet.prototype._addLine = function(line, index) {
  var self = this;
  var p;
  p = new Param(self._context, self._isCtor, line.input, line.parsed);
  if (!p.success) {
    if (index !== 0 || self._context.isFileScope) {
      return null;
    }
    // could be the return type.
    return self._tryReturnType(line.str);
  }

  self._params.push(p);
  if (p.isMember) {
    self._context.cls.addMember(p.name, p.type, p.accessType);
  }
  return p;
};

/**
 * @param {string} line
 * @return {boolean}
 * @private
 */
ParamSet.prototype._tryReturnType = function(line) {
  var self = this;
  var re;
  re = /^\s*\\(.*)\\\s*$/.exec(line);
  if (!re) {
    return false;
  }
  self._returnType = new type.Decoder(self._context.pkg, re[1]);
  return true;
};

/** @param {string} return_type */
ParamSet.prototype.setReturnType = function(return_type) {
  var self = this;
  if (return_type) {
    self._returnType = new type.Decoder(self._context.pkg, return_type);
  }
};

/** @return {boolean} */
ParamSet.prototype.isEmpty = function() {
  var self = this;
  return self._params.length === 0;
};

/** @type {number} */
ParamSet.prototype.numParams;
ParamSet.prototype.__defineGetter__('numParams', function() {
  var self = this;
  return self._params.length;
});

/**
 * @param {number} i
 * @return {type.Decoder}
 */
ParamSet.prototype.paramType = function(i) {
  var self = this;
  return self._params[i].type;
};

/** @return {boolean} */
ParamSet.prototype.isInitEmpty = function() {
  var self = this;
  return !self._params.some(
  /** @param {Param} p */
  function(p) {
    return p.isMember || p.initType === '?';
  });
};

/** @return {boolean} */
ParamSet.prototype.isDeclEmpty = function() {
  var self = this;
  return !self._returnType && !self._params.some(
  /** @param {Param} p */
  function(p) {
    return !!p.type;
  });
};

/** @return {!Array.<string>} */
ParamSet.prototype.outputDecls = function() {
  var self = this;
  var result;
  result = self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.outputDecl();
  }).filter(
  /** @param {string} s */
  function(s) {
    return !!s;
  });
  if (self._returnType) {
    result.push('@return {' + self._returnType.output() + '}');
  }
  return result;
};

/** @return {string} */
ParamSet.prototype.outputParams = function() {
  var self = this;
  // function parameter output.
  return self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.outputParam();
  }).filter(
  /** @param {string} s */
  function(s) {
    return !!s;
  }).join(', ');
};

/** @return {string} */
ParamSet.prototype.outputArgTypes = function() {
  var self = this;
  return '[' + self._params.map(
  /** @param {Param} p */
  function(p) {
    return p.outputArgType();
  }).join(', ') + ']';
};

/** @param {type.Callable} types */
ParamSet.prototype.setArgTypes = function(types) {
  var self = this;
  self._params.forEach(
  /** @param {!Param} p */
  function(p) {
    types.addArg(p.argtype());
  });
};
/**
 * @param {input.Line} input
 * @param {LineParser} p
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var SeparatorLine = function(input, p) {
  var self = this;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;
  /**
   * @type {number}
   * @private
   */
  this._indent = (p.indent);
};
SeparatorLine.prototype._classname = 'SeparatorLine';
/** @type {input.Line} */
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
SeparatorLine.prototype.isContinuation;
SeparatorLine.prototype.__defineGetter__('isContinuation', function() {
  var self = this;
  return false;
});

/** @return {output.Line} */
SeparatorLine.prototype.output = function() {
  var self = this;
  return null;
};
/**
 * @param {string} name
 * @param {string} packageName
 * @param {Array.<string>} input
 * @param {Array.<string>} output
 * @param {boolean} isGlobal
 * @param {boolean} expectError
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var TestCase = function(name, packageName, input, output, isGlobal, expectError) {
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
  this._packageName = packageName;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._input = input;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._output = output;
  /**
   * @type {boolean}
   * @private
   */
  this._isGlobal = isGlobal;
  /**
   * @type {boolean}
   * @private
   */
  this._expectError = expectError;
  /**
   * @type {boolean}
   * @private
   */
  this._failed = (false);
};
TestCase.prototype._classname = 'TestCase';
/** @type {boolean} */
TestCase.prototype.failed;
TestCase.prototype.__defineGetter__('failed', function() {
return this._failed;
});

TestCase.prototype.run = function() {
  var self = this;
  var c;
  c = self._isGlobal ? (
    new FileScope(self._name, self._packageName, 'FileName')
  ) : (
    new CodeScope(new context.Context(self._name, new context.Package('')))
  );

  var actual_output;
  actual_output = '';
  OUTPUT_ERROR = !self._expectError;
  try {
    c.processLines(self._input);
    actual_output = c.output();
    if (self._isGlobal) {
      var type_str;
      type_str = objStringify(c.types.extract(), true);
      if (type_str) {
        actual_output = actual_output.concat(type_str.split('\n'));
      }
    }
  }
  catch (e) {
    if (self._expectError) {
      console.log('PASS: ' + self._name);
      return;
    }
    else {
      console.log('EXCEPTION: ' + self._name);
      self._warnWithIndent('input', self._input);
      self._warnWithIndent('expected', self._output);
      self._failed = true;
      throw e;
    }
  }

  if (actual_output.join('\n') === self._output.join('\n') && !self._expectError) {
    console.log('PASS: ' + self._name);
  }
  else {
    console.log('FAIL: ' + self._name);
    self._warnWithIndent('input', self._input);
    self._warnWithIndent('expected', self._expectError ? ['<<error>>'] : self._output);
    self._warnWithIndent('actual', actual_output);
    if (!self._expectError) {
      self._warnWithIndent('diff', self._makeDiff(self._output, actual_output));
    }
    self._failed = true;
  }
};

/**
 * @param {string} title
 * @param {Array.<string>} content
 * @private
 */
TestCase.prototype._warnWithIndent = function(title, content) {
  var self = this;
  console.log('  ' + title + ':');
  var warn_rec;
  warn_rec = 
  /**
   * @param {string|Array} lines
   * @param {number} level
   */
  function(lines, level) {
    if (typeof(lines) === 'string') {
      console.log(whitespaces(4 + level * 2) + lines);
    }
    else {
      if (lines instanceof output.Line) {
        lines = lines.output;
      }
      lines.forEach(
      /** @param {string|Array} line */
      function(line) {
        warn_rec(line, level + 1);
      });
    }
  };
  warn_rec(content, 0);
};

/**
 * @param {Array.<string>} lines0
 * @param {Array.<string>} lines1
 * @private
 */
TestCase.prototype._makeDiff = function(lines0, lines1) {
  var self = this;
  var result;
  result = [];
  lines0.forEach(
  /**
   * @param {string} line0
   * @param {number} i
   */
  function(line0, i) {
    if (lines1.length <= i) {
      result.push('- ' + line0);
      return;
    }
    var line1;
    line1 = lines1[i];
    if (line0 !== line1) {
      result.push('< ' + line0);
      result.push(' >' + line1);
    }
    else {
      result.push('= ' + line0);
    }
  });
  lines1.slice(lines0.length).forEach(
  /** @param {string} line */
  function(line) {
    result.push('+ ' + line);
  });
  return result;
};

  exports.TestCase = TestCase;
var transformToJs = /**
 * @param {string} base_dir
 * @param {string} in_file
 * @param {string} out_file
 */
function(base_dir, in_file, out_file) {
  var pkg_name;
  pkg_name = relativeFileName(
    base_dir,
    in_file.replace(/[\/\\][^\/\\]*$/, '')
  ).replace(/[\/\\]/, '.');
  var file_name;
  file_name = in_file.replace(/.*[\/\\]/, '').replace(/\..*$/, '');

  var c;
  c = new FileScope(in_file, pkg_name, file_name);
  c.processLines(_fs.readFileSync(in_file, 'utf-8').split('\n'));
  writeFile(out_file, c.output().join('\n'));
  writeFile(
    out_file.replace(/\.js$/, '.tk'),
    JSON.stringify(c.types.extract())
  );
};

var relativeFileName = /**
 * @param {string} base_dir
 * @param {string} file_name
 */
function(base_dir, file_name) {
  if (base_dir && file_name.indexOf(base_dir) === 0) {
    // strip off the base_dir.
    return file_name.substr(base_dir.length).replace(/^[\/\\]*/, '');
  }
  return file_name;
};

var outputFileName = /**
 * @param {string} base_dir
 * @param {string} in_file
 * @param {string} out_dir
 */
function(base_dir, in_file, out_dir) {
  return out_dir + '/' + relativeFileName(base_dir, (
    in_file.replace(/\.ir$/, '.js')
  ));
};

var needCompile = /**
 * @param {string} src
 * @param {string} dst
 */
function(src, dst) {
  if (!_fs.existsSync(dst)) {
    return true;
  }
  var src_stat;
  src_stat = _fs.statSync(src);
  var dst_stat;
  dst_stat = _fs.statSync(dst);
  return src_stat.mtime.getTime() > dst_stat.mtime.getTime();
};

  exports.compileFiles = 
  /**
   * @param {string} base_dir
   * @param {Array.<string>} in_files
   * @param {string} out_dir
   * @param {boolean=} opt_silent
   */
  function(base_dir, in_files, out_dir, opt_silent) {
    var silent = opt_silent === undefined ? (false) : opt_silent;
    in_files.forEach(
    /** @param {string} in_file */
    function(in_file) {

      var out_file;
      out_file = outputFileName(base_dir, in_file, out_dir);
      var logstr;
      logstr = '[' + in_file + ' => ' + out_file + '] ';

      if (!_fs.existsSync(in_file)) {
        console.error(logstr + 'input not found');
        return;
      }

      if (!needCompile(in_file, out_file)) {
        if (!silent) {
          console.log(logstr + 'skipping');
        }
        return;
      }

      if (!silent) {
        console.log(logstr + 'compiling');
      }
      transformToJs(base_dir, in_file, out_file);
    });
  };
/*
Write data into the specified file. Create the file or its directory If they do
not exit.
*/
var writeFile = /**
 * @param {string} path
 * @param {string} data
 */
function(path, data) {
  var dir;
  dir = _path.dirname(path);
  if (!_fs.existsSync(dir)) {
    _fs.mkdirSync(dir);
  }

  _fs.writeFileSync(
    path,
    data,
    'utf-8'
  );
};
var OUTPUT_ERROR = true;

var error = /**
 * @param {input.Line} line
 * @param {string=} opt_msg
 * @param {Array.<string>=} additional_lines
 */
function(line, opt_msg, additional_lines) {
  var msg = opt_msg === undefined ? ('*warning*') : opt_msg;
  if (OUTPUT_ERROR) {
    console.error(line.file + ':' + line.lineNo + ': ERROR - ' + msg);
  }
  if (additional_lines) {
    additional_lines.forEach(
    /** @param {string} additional_line */
    function(additional_line) {
      if (OUTPUT_ERROR) {
        console.error(additional_line);
      }
    });
  }
  else {
    if (OUTPUT_ERROR) {
      console.error(line.line);
    }
  }
  if (OUTPUT_ERROR) {
    console.trace();
  }
  throw "Compile Error";
};

var assert = /**
 * @param {*} check
 * @param {input.Line=} opt_line
 * @param {string=} opt_msg
 */
function(check, opt_line, opt_msg) {
  var line = opt_line === undefined ? (input.UnknownInputLine) : opt_line;
  var msg = opt_msg === undefined ? ('*assertion*') : opt_msg;
  console.assert(
    check,
    msg + (line ? ' (line ' + line.lineNo + '): ' + line.line : '')
  );
};

var l = /**
 * @param {*} item
 * @param {string=} title
 */
function(item, title) {
  if (title) {
    console.error('>>> ' + title);
  }
  console.error(item);
};
  exports.createPackageList = 
  /**
   * @param {string} basedir
   * @param {Array.<string>} files
   * @return {Array.<string>}
   */
  function(basedir, files) {
    var pkgs;
    pkgs = {};
    files.forEach(
    /** @param {string} file */
    function(file) {
      if (!/[\/\\]/.test(file)) {
        return;
      }
      var pkg_name;
      pkg_name = file.replace(/[\/\\][^\/\\]*$/, '');

      if (basedir && pkg_name.indexOf(basedir) === 0) {
        // strip off the basedir.
        pkg_name = pkg_name.substr(basedir.length);
      }
      pkg_name = pkg_name.replace(/^[\/\\]*/, '').replace(/[\/\\]/, '.');
      if (!pkg_name) {
        return;
      }

      var name;
      name = '';
      pkg_name.split(/[\/\\]/).forEach(
      /** @param {string} segment */
      function(segment) {
        if (name) {
          name += '.';
        }
        name += segment;
        pkgs[name] = true;
      });
    });

    return Object.keys(pkgs).sort().map(
    /** @param {string} pkg */
    function(pkg) {
      return (pkg.indexOf('.') >= 0 ? '' : 'var ') + pkg + ' = {};';
    });
  };
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
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
StringSet.prototype.addAll = function(strs) {
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
StringSet.prototype.filterOut = function(strs) {
  var self = this;
  // remove the strings that are in this set.
  return strs.filter(
  /** @param {string} f */
  function(f) {
    return !self._map[f];
  });
};


/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var ClassDeps = function() {
  var self = this;
  // Maps class name to file name where its defined.
  /**
   * @type {Object.<string, string>}
   * @private
   */
  this._where = ({});
  // Maps file name to array of required class names.
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
    var list;
    list = self._depends[k];
    return list.length ? '[' + k + ':' + list.join('|') + ']' : '';
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
      return self._where[dep] !== file;
    });
  });
};

/**
 * @param {string} file
 * @return {boolean}
 */
ClassDeps.prototype.hasDeps = function(file) {
  var self = this;
  var dep;
  dep = self._depends[file];
  return !!dep && !!dep.length;
};

/**
 * @param {string} file
 * @param {StringSet} provided_files
 */
ClassDeps.prototype.removeDeps = function(file, provided_files) {
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


  exports.createSortedList = 
  /**
   * @param {Array.<string>} files
   * @return {Array.<string>}
   */
  function(files) {
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
        deps.removeDeps(f, sorted);

        if (!deps.hasDeps(f)) {
          found.add(f);
        }
      });

      if (!found.size()) {
        // no progress. something's wrong.
        console.log('remaining deps: ' + deps);
        throw 'circular inheritance dependencies';
      }

      sorted.addAll(found.list());

      // remove all the found files.
      all = found.filterOut(all);
    }
    return sorted.list();
  };
var arrFlatten = /** @param {string|Array} lines */
function(lines) {
  if (typeof(lines) === 'string') {
    return [lines];
  }
  if (lines instanceof output.Line || lines instanceof output.Block) {
    lines = lines.output;
  }
  console.assert(
    lines instanceof Array,
    'input to arrFlatten should be a string or an array'
  );
  return lines.reduce(
  /**
   * @param {Array} arr
   * @param {string|Array} line
   */
  function(arr, line) {
    return arr.concat(arrFlatten(line));
  }, []);
};

var check = /** @param {Object} obj */
function(obj) {
  console.log(_util.inspect(obj, false, null));
};

var whitespaces = /**
 * @param {number} num
 * @return {string}
 */
function(num) {
  var s;
  s = '';
  var i;
  i = 0;
  for (; i < num; i++) {
    s += ' ';
  }
  return s;
};

var objStringify = /**
 * @param {Object} obj
 * @param {boolean=} compact
 * @param {string=} name
 * @param {number=} opt_level
 * @return {string}
 */
function(obj, compact, name, opt_level) {
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
      return objStringify(c, compact, undefined, level + 1);
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
      return objStringify(obj[k], compact, k, level + 1);
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

var docLines = /**
 * @param {!Array.<string>} annotations
 * @return {!Array.<string>}
 */
function(annotations) {
  var alist;
  alist = arrFlatten(annotations);
  if (alist.length === 0) {
    return [];
  }
  if (alist.length === 1) {
    return ['/** ' + alist[0] + ' */'];
  }
  return arrFlatten([
    '/**',
    alist.map(
    /** @param {string} annotation */
    function(annotation) {
      return ' * ' + annotation;
    }),
    ' */'
  ]);
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
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
context.Class.prototype.setMember = function(name, member) {
  var self = this;
  self._members[name] = member;
};

/**
 * @param {string} method_name
 * @return {!context.Name}
 */
context.Class.prototype.methodName = function(method_name) {
  var self = this;
  return self.name().property(method_name);
};

/**
 * @param {string} property_name
 * @return {!context.Name}
 */
context.Class.prototype.staticName = function(property_name) {
  var self = this;
  return self.name().staticProperty(property_name);
};

/**
 * @param {string} name
 * @param {type.Decoder} type
 * @param {string} access_type
 * @param {boolean=} opt_is_pseudo
 * @return {Member}
 */
context.Class.prototype.addMember = function(name, type, access_type, opt_is_pseudo) {
  var self = this;
  var is_pseudo = opt_is_pseudo === undefined ? (false) : opt_is_pseudo;
  var m;
  m = new Member(name, type, access_type, is_pseudo);
  self._members[name] = m;
  return m;
};

/** @return {Array} */
context.Class.prototype.outputAccessors = function() {
  var self = this;
  var class_name;
  class_name = self.name();
  return Object.keys(self._members).map(
  /** @param {string} name */
  function(name) {
    return self._members[name].outputAccessors(class_name);
  });
};
/**
 * @param {string} fileName
 * @param {!context.Package} pkg
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
context.Context = function(fileName, pkg) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._fileName = fileName;
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
  this._isCtor = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._isMethod = (false);
  /**
   * @type {boolean}
   * @private
   */
  this._isFileScope = (false);
};
context.Context.prototype._classname = 'context.Context';
/** @type {string} */
context.Context.prototype.fileName;
context.Context.prototype.__defineGetter__('fileName', function() {
return this._fileName;
});
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
context.Context.prototype.isCtor;
context.Context.prototype.__defineGetter__('isCtor', function() {
return this._isCtor;
});
context.Context.prototype.__defineSetter__('isCtor', function(value) {
this._isCtor = value;
});
/** @type {boolean} */
context.Context.prototype.isMethod;
context.Context.prototype.__defineGetter__('isMethod', function() {
return this._isMethod;
});
context.Context.prototype.__defineSetter__('isMethod', function(value) {
this._isMethod = value;
});
/** @type {boolean} */
context.Context.prototype.isFileScope;
context.Context.prototype.__defineGetter__('isFileScope', function() {
return this._isFileScope;
});
context.Context.prototype.__defineSetter__('isFileScope', function(value) {
this._isFileScope = value;
});

/**
 * @param {number} scopeLevel
 * @return {!context.Name}
 */
context.Context.prototype.scopedName = function(scopeLevel) {
  var self = this;
  // 0: class, 1: package, 2: global.
  switch (scopeLevel) {
    case 0:;
    return self._cls.staticName(self._name.id);

    case 1:;
    return self._name;

    default:;
    return self._name.global();
  }
};

/** @return {!context.Context} */
context.Context.prototype.clone = function() {
  var self = this;
  var c;
  c = new context.Context(self._fileName, self._pkg);
  c.name = self._name;
  c.cls = self._cls;
  c.isCtor = self._isCtor;
  c.isMethod = self._isMethod;
  c.isFileScope = self._isFileScope;
  return c;
};
/*
Name in file scope.
*/
/**
 * @param {!context.Package} pkg
 * @param {string} id
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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

/** @type {string} */
context.Name.prototype.decl;
context.Name.prototype.__defineGetter__('decl', function() {
  var self = this;
  return (self._pkg.empty() ? 'var ' : '') + self._pkg.fullname(self._id);
});

/** @type {string} */
context.Name.prototype.ref;
context.Name.prototype.__defineGetter__('ref', function() {
  var self = this;
  return self._pkg.fullname(self._id);
});

/** @return {!context.Name} */
context.Name.prototype.global = function() {
  var self = this;
  return new context.Name(new context.Package(''), self._id);
};

/**
 * @param {string} id
 * @return {!context.Name}
 */
context.Name.prototype.property = function(id) {
  var self = this;
  return new context.Name(new context.Package(self.ref + '.prototype'), id);
};

/**
 * @param {string} id
 * @return {!context.Name}
 */
context.Name.prototype.staticProperty = function(id) {
  var self = this;
  return new context.Name(new context.Package(self.ref), id);
};

/** @return {string} */
context.Name.prototype.toString = function() {
  var self = this;
  return '[' + self._pkg + ':' + self._id + ']';
};
/*
Package name.
*/
/**
 * @param {string} pkg
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
context.Package.prototype.replaceStr = function(str) {
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
/*
Comment section in a file.
*/
/**
 * @param {Array.<input.Line>} lines
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
input.Comment = function(lines) {
  var self = this;
  /**
   * @type {Array.<input.Line>}
   * @private
   */
  this._lines = lines;
};
input.Comment.prototype._classname = 'input.Comment';

input.Comment.prototype.output = function() {
  var self = this;
  var result;
  result = [];
  var buffer;
  buffer = [];
  var state;
  state = 's';
  self._lines.forEach(
  /** @param {input.Line} line */
  function(line) {
    switch (state) {
      // starting state -- output all the blank lines as is.
      case 's':;
      if (!line.isBlank) {
        // first non-blank.
        result.push(buffer);
        buffer = [];
        state = 'n';
      }
      break;

      // in non-blank line section.
      case 'n':;
      if (line.isBlank) {
        state = 'a';
      }
      break;

      // blank line immediately following a non-blank.
      case 'a':;
      if (line.isBlank) {
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
      if (!line.isBlank) {
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
/*
Parses input lines into comments and sections.
'line' is used only during processing.
*/
/**
 * @param {string} name
 * @param {Array.<string>} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
input.File = function(name, input) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._name = name;
  /**
   * @type {Array.<string>}
   * @private
   */
  this._input = input;
  /**
   * @type {Array.<input.Comment|input.Section>}
   * @private
   */
  this._result = ([]);
  /**
   * @type {Array.<input.Line>}
   * @private
   */
  this._buffer = ([]);
  /**
   * @type {number?}
   * @private
   */
  this._lastValidIndex = (null);
};
input.File.prototype._classname = 'input.File';

/** @return {Array.<input.Comment|input.Section>} */
input.File.prototype.parse = function() {
  var self = this;
  self._input.forEach(
  /**
   * @param {string} line
   * @param {number} index
   */
  function(line, index) {
    line = line.trimRight();
    self._processLine(new input.Line(self._name, line, index));
  });
  self._flushBuffer();
  return self._result;
};

/**
 * @param {input.Line} line
 * @private
 */
input.File.prototype._processLine = function(line) {
  var self = this;
  if (line.startsWithColon) {
    // should be a start of a code section.
    self._flushBuffer();
    self._lastValidIndex = 0;
  }
  else if (line.isIndented) {
    // indented line -- continues either comment or code section.
    if (self._lastValidIndex !== null) {
      self._lastValidIndex = self._buffer.length;
    }
  }
  else if (!line.isBlank) {
    // global comment.
    if (self._lastValidIndex !== null) {
      // close the code section.
      self._flushBuffer();
    }
  }
  // anything else is invalid line -- continues either comment or code section.
  self._buffer.push(line);
};

/** @private */
input.File.prototype._flushBuffer = function() {
  var self = this;
  while (self._buffer.length) {
    var next_buffer;
    next_buffer = [];
    if (self._lastValidIndex !== null) {
      var section;
      section = new input.Section(self._buffer[0]);
      self._result.push(section);
      self._buffer.forEach(
      /**
       * @param {input.Line} line
       * @param {number} index
       */
      function(line, index) {
        if (index === 0) {
          // we already passed the header line to section.
          return;
        }
        else if (index <= self._lastValidIndex) {
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
      self._result.push(new input.Comment(self._buffer));
    }
    self._lastValidIndex = null;
    self._buffer = next_buffer;
  }
};
/*
A line of input file. Keeps track of the row index.
*/
/**
 * @param {string} file
 * @param {string} line
 * @param {number} rowIndex
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
input.Line = function(file, line, rowIndex) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._file = file;
  /**
   * @type {string}
   * @private
   */
  this._line = line;
  /**
   * @type {number}
   * @private
   */
  this._rowIndex = rowIndex;
};
input.Line.prototype._classname = 'input.Line';
/** @type {string} */
input.Line.prototype.file;
input.Line.prototype.__defineGetter__('file', function() {
return this._file;
});
/** @type {string} */
input.Line.prototype.line;
input.Line.prototype.__defineGetter__('line', function() {
return this._line;
});
/** @type {number} */
input.Line.prototype.rowIndex;
input.Line.prototype.__defineGetter__('rowIndex', function() {
return this._rowIndex;
});

/** @type {number} */
input.Line.prototype.lineNo;
input.Line.prototype.__defineGetter__('lineNo', function() {
  var self = this;
  return self._rowIndex + 1;
});

/*
the line contents with indentation stripped off.
trailing whitespace should have been stripped already.
*/
/** @type {string} */
input.Line.prototype.trim;
input.Line.prototype.__defineGetter__('trim', function() {
  var self = this;
  var re;
  re = /\S.*/.exec(self._line);
  return re ? re[0] : '';
});

/** @type {boolean} */
input.Line.prototype.startsWithColon;
input.Line.prototype.__defineGetter__('startsWithColon', function() {
  var self = this;
  return self._line.substr(0, 1) === ':';
});

/** @type {boolean} */
input.Line.prototype.isBlank;
input.Line.prototype.__defineGetter__('isBlank', function() {
  var self = this;
  return /^\s*$/.test(self._line);
});

/** @type {boolean} */
input.Line.prototype.isIndented;
input.Line.prototype.__defineGetter__('isIndented', function() {
  var self = this;
  return /^\s/.test(self._line);
});

/** @type {number} */
input.Line.prototype.indent;
input.Line.prototype.__defineGetter__('indent', function() {
  var self = this;
  var re;
  re = /\S/.exec(self._line);
  return re ? re.index : 0;
});

input.UnknownInputLine = new input.Line('(unknown)', '', -1);
/*
Input code section.
*/
/**
 * @param {input.Line} header
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
input.Section = function(header) {
  var self = this;
  /**
   * @type {input.Line}
   * @private
   */
  this._header = header;
  /**
   * @type {Array.<input.Line>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {section.Code}
   * @private
   */
  this._code = (null);
};
input.Section.prototype._classname = 'input.Section';
/** @type {input.Line} */
input.Section.prototype.header;
input.Section.prototype.__defineGetter__('header', function() {
return this._header;
});
/** @type {Array.<input.Line>} */
input.Section.prototype.lines;
input.Section.prototype.__defineGetter__('lines', function() {
return this._lines;
});
/** @type {section.Code} */
input.Section.prototype.code;
input.Section.prototype.__defineGetter__('code', function() {
return this._code;
});
input.Section.prototype.__defineSetter__('code', function(value) {
this._code = value;
});

/** @param {input.Line} line */
input.Section.prototype.push = function(line) {
  var self = this;
  self._lines.push(line);
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
output.Block = function() {
  var self = this;
  /**
   * @type {!Array.<!output.Line>}
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
output.Block.prototype.appendLine = function(line) {
  var self = this;
  self._lines.push(line);
};

/** @type {boolean} */
output.Block.prototype.isEmpty;
output.Block.prototype.__defineGetter__('isEmpty', function() {
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
output.Block.prototype._addSuffix = function(lines) {
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
    self._addSuffix(lines);
  }
  return lines;
});
/*
Helper for Line to construct the output.
*/
/**
 * @param {number} num_indent
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
output.IndentedMultiline = function(num_indent) {
  var self = this;
  /**
   * @type {string}
   * @private
   */
  this._indent = (whitespaces(num_indent));
  /**
   * @type {!Array.<string>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {boolean}
   * @private
   */
  this._lastLineOpen = (false);
};
output.IndentedMultiline.prototype._classname = 'output.IndentedMultiline';

/** @type {!Array.<string>} */
output.IndentedMultiline.prototype.output;
output.IndentedMultiline.prototype.__defineGetter__('output', function() {
  var self = this;
  return self._lines;
});

/**
 * @param {string} line
 * @param {boolean=} opt_end_line
 * @param {boolean=} opt_insert_blank
 */
output.IndentedMultiline.prototype.appendLine = function(line, opt_end_line, opt_insert_blank) {
  var self = this;
  var end_line = opt_end_line === undefined ? (true) : opt_end_line;
  var insert_blank = opt_insert_blank === undefined ? (false) : opt_insert_blank;
  if (line || insert_blank) {
    if (self._lastLineOpen) {
      self._lines[self._lines.length - 1] += line;
    }
    else {
      self._lines.push(line ? self._indent + line : '');
    }
    self._lastLineOpen = !end_line;
  }
  else {
    self._lastLineOpen = false;
  }
};

/** @param {!Array.<string>} lines */
output.IndentedMultiline.prototype.appendAll = function(lines) {
  var self = this;
  lines.forEach(
  /** @param {string} line */
  function(line) {
    self.appendLine(line);
  });
};

/*
Lines added as is.
Block does not share its lines with the surrounding lines.
*/
/** @param {!Array.<string>} block */
output.IndentedMultiline.prototype.appendBlock = function(block) {
  var self = this;
  self._lines = self._lines.concat(block);
  self._lastLineOpen = false;
};
/*
Output lines corresponds to one input line.
*/
/**
 * @param {input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
output.Line = function(input) {
  var self = this;
  /**
   * @type {input.Line}
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
  this._prefixLines = ([]);
  /**
   * @type {!output.Multiline}
   * @private
   */
  this._lines = (new output.Multiline());
  /**
   * @type {string}
   * @private
   */
  this._linePrefix = ('');
  /**
   * @type {string}
   * @private
   */
  this._lineSuffix = ('');
  /**
   * @type {Array.<string>}
   * @private
   */
  this._tailComment = ([]);
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
/** @type {Array.<string>} */
output.Line.prototype.prefixLines;
output.Line.prototype.__defineGetter__('prefixLines', function() {
return this._prefixLines;
});
output.Line.prototype.__defineSetter__('prefixLines', function(value) {
this._prefixLines = value;
});
/** @type {!output.Multiline} */
output.Line.prototype.lines;
output.Line.prototype.__defineGetter__('lines', function() {
return this._lines;
});
/** @type {string} */
output.Line.prototype.linePrefix;
output.Line.prototype.__defineGetter__('linePrefix', function() {
return this._linePrefix;
});
output.Line.prototype.__defineSetter__('linePrefix', function(value) {
this._linePrefix = value;
});
/** @type {string} */
output.Line.prototype.lineSuffix;
output.Line.prototype.__defineGetter__('lineSuffix', function() {
return this._lineSuffix;
});
output.Line.prototype.__defineSetter__('lineSuffix', function(value) {
this._lineSuffix = value;
});
/** @type {Array.<string>} */
output.Line.prototype.tailComment;
output.Line.prototype.__defineGetter__('tailComment', function() {
return this._tailComment;
});
output.Line.prototype.__defineSetter__('tailComment', function(value) {
this._tailComment = value;
});

/** @type {boolean} */
output.Line.prototype.empty;
output.Line.prototype.__defineGetter__('empty', function() {
  var self = this;
  return self._lines.empty && !self._linePrefix && !self._lineSuffix;
});

/** @param {string} line */
output.Line.prototype.appendLine = function(line) {
  var self = this;
  self._lines.appendStr(line);
  self._lines.terminateLine();
};

/** @type {Array.<string>} */
output.Line.prototype.output;
output.Line.prototype.__defineGetter__('output', function() {
  var self = this;
  var out;
  out = new output.IndentedMultiline(self._indent);
  out.appendAll(self._prefixLines);
  out.appendLine(self._linePrefix, false);
  self._lines.lines.forEach(
  /**
   * @param {string|output.Block} line
   * @param {number} i
   */
  function(line, i) {
    if (line instanceof output.Block) {
      out.appendBlock(line.output);
    }
    else {
      // line is a string.
      out.appendLine(line, i < self._lines.lines.length - 1, true);
    }
  });
  // This closes the last line even when @lineSuffix is ''.
  out.appendLine(self._lineSuffix);
  out.appendAll(self._tailComment);
  return out.output;
});
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
output.Multiline = function() {
  var self = this;
  /**
   * @type {!Array.<!output.Block|string>}
   * @private
   */
  this._lines = ([]);
  /**
   * @type {boolean}
   * @private
   */
  this._lastLineOpen = (false);
};
output.Multiline.prototype._classname = 'output.Multiline';
/** @type {!Array.<!output.Block|string>} */
output.Multiline.prototype.lines;
output.Multiline.prototype.__defineGetter__('lines', function() {
return this._lines;
});

/** @type {boolean} */
output.Multiline.prototype.empty;
output.Multiline.prototype.__defineGetter__('empty', function() {
  var self = this;
  return !self._lines.length;
});

/** @param {string} line */
output.Multiline.prototype.appendStr = function(line) {
  var self = this;
  if (self._lastLineOpen) {
    self._lines[self._lines.length - 1] += line;
  }
  else {
    self._lines.push(line);
  }
  self._lastLineOpen = true;
};

/** @param {!Array.<string>} lines */
output.Multiline.prototype.appendLines = function(lines) {
  var self = this;
  lines.forEach(
  /** @param {string} line */
  function(line) {
    self.appendStr(line);
    self.terminateLine();
  });
};

output.Multiline.prototype.terminateLine = function() {
  var self = this;
  self._lastLineOpen = false;
};

/** @param {!output.Block} block */
output.Multiline.prototype.appendBlock = function(block) {
  var self = this;
  self._lines.push(block);
  self._lastLineOpen = false;
};
/*
Container and interface of the TokenList to the rest of the converter.
*/
/**
 * @param {parser.TokenList} tokens
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
parser.Result = function(tokens) {
  var self = this;
  /**
   * @type {parser.TokenList}
   * @private
   */
  this._tokens = tokens;
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
parser.Result.prototype.prevLines;
parser.Result.prototype.__defineGetter__('prevLines', function() {
  var self = this;
  return self._tokens.prevLines;
});

/** @type {Array.<string>} */
parser.Result.prototype.tailComment;
parser.Result.prototype.__defineGetter__('tailComment', function() {
  var self = this;
  return self._tokens.nextLines;
});

/** @return {Array.<string>} */
parser.Result.prototype.rendered = function() {
  var self = this;
  var lines;
  lines = [];
  self._tokens.prevLines.map(
  /** @param {parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  var code_line;
  code_line = self._tokens.toString();
  if (code_line) {
    lines.push(code_line);
  }
  self._tokens.nextLines.map(
  /** @param {parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  return lines;
};
/*
Wrapper for the PEGJS's parse method.
Specific for a particular target (i.e. rule).
TODO: Make xformer available to the parser so that we don't need to do double
conversion.
*/
/**
 * @param {string} rule
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
 * @param {!Array.<input.Line>|string} line
 * @param {LineTransformer=} xformer
 * @param {boolean=} show_error_line
 * @return {?parser.Result}
 */
parser.Target.prototype.run = function(line, xformer, show_error_line) {
  var self = this;
  if (!(line instanceof Array)) {
    line = [new input.Line('', line, 0)];
  }

  var lines;
  lines = line.map(
  /** @param {input.Line} l */
  function(l) {
    return l.line;
  }).join('\n');
  try {
    var result;
    result = _parser.parse(lines, {
      'startRule': self._rule
    });
  }
      //xformer: xformer
  catch (e) {
    throw self._addContextLines(e, line);
  }

  var b;
  b = new parser.TokenListBuilder(result);
  if (xformer) {
    b.xformer = xformer;
  }
  return b.result(line);
};

/**
 * @param {Object} e
 * @param {!Array.<input.Line>} line
 * @private
 */
parser.Target.prototype._addContextLines = function(e, line) {
  var self = this;
  e.contextLines = [];
  line.forEach(
  /**
   * @param {input.Line} l
   * @param {number} i
   */
  function(l, i) {
    e.contextLines.push(l.line);
    if (i === e.line - 1) {
      var sp;
      sp = '';
      var j;
      j = 0;
      for (; j < e.offset; j++) {
        sp += ' ';
      }
      e.contextLines.push(sp + '^');
    }
  });
  return e;
};
/**
 * @param {string} type
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
 * @struct
 * @suppress {checkStructDictInheritance}
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
  this._prevLines = ([]);
  /**
   * @type {Array.<string>}
   * @private
   */
  this._nextLines = ([]);
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
parser.TokenList.prototype.prevLines;
parser.TokenList.prototype.__defineGetter__('prevLines', function() {
return this._prevLines;
});
/** @type {Array.<string>} */
parser.TokenList.prototype.nextLines;
parser.TokenList.prototype.__defineGetter__('nextLines', function() {
return this._nextLines;
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
parser.TokenList.prototype.isEmpty;
parser.TokenList.prototype.__defineGetter__('isEmpty', function() {
  var self = this;
  if (self._prevLines.length || self._nextLines.length) {
    return false;
  }
  if (!self._list.length) {
    return true;
  }
  if (self._list.length >= 2) {
    return false;
  }
  return !(self._list[0] instanceof parser.BlockMarker) && self._list[0] === '';
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
      arg.prevLines.forEach(
      /** @param {string} l */
      function(l) {
        self._prevLines.push(l);
      });
      arg.nextLines.forEach(
      /** @param {string} l */
      function(l) {
        self._nextLines.push(l);
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
    self._prevLines = self._prevLines.concat(line.prevLines);
    self._nextLines = self._nextLines.concat(line.nextLines);
  }
  self._prevLines.push(line.toString());
  return self;
};

/** @param {parser.TokenList|string} line */
parser.TokenList.prototype.append = function(line) {
  var self = this;
  if (line instanceof parser.TokenList) {
    self._prevLines = self._prevLines.concat(line.prevLines);
    self._nextLines = self._nextLines.concat(line.nextLines);
  }
  self._nextLines.push(line.toString());
  return self;
};

/** @return {string} */
parser.TokenList.prototype.toString = function() {
  var self = this;
  return self._list.join('');
};


/**
 * @param {string} name
 * @param {boolean} isMember
 * @param {string} access
 * @param {string} type
 * @param {string} marker
 * @param {parser.TokenList} init
 * @constructor
 * @extends {parser.TokenList}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
parser.ParamLine = function(name, isMember, access, type, marker, init) {
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
  this._isMember = isMember;
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
parser.ParamLine.prototype.isMember;
parser.ParamLine.prototype.__defineGetter__('isMember', function() {
return this._isMember;
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
    self._isMember ? '@' : '',
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
 * @struct
 * @suppress {checkStructDictInheritance}
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
    self._buildRec(self._parsed);
  }
  return self._tokens;
};

/**
 * @param {!Array.<input.Line>} line
 * @return {parser.Result}
 */
parser.TokenListBuilder.prototype.result = function(line) {
  var self = this;
  self.build();
  return new parser.Result(self._tokens);
};

/**
 * @param {parser.TokenList|Array|Object|string} data
 * @private
 */
parser.TokenListBuilder.prototype._buildRec = function(data) {
  var self = this;
  if (data instanceof parser.TokenList) {
    self._addTokens(data);
    return;
  }

  if (data instanceof Array) {
    self._addArray(data);
    return;
  }

  if (data instanceof Object) {
    self._addObject(data);
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
parser.TokenListBuilder.prototype._addTokens = function(data) {
  var self = this;
  self._tokens.add(data);
};

/**
 * @param {Array} data
 * @private
 */
parser.TokenListBuilder.prototype._addArray = function(data) {
  var self = this;
  data.forEach(
  /** @param {parser.TokenList|Array|Object|string} elem */
  function(elem) {
    self._buildRec(elem);
  });
};

/**
 * @param {Object} data
 * @private
 */
parser.TokenListBuilder.prototype._addObject = function(data) {
  var self = this;
  if (data.g) {
    var p;
    p = data.params;
    switch (data.g) {
      case 'c':;
      var str;
      str = p['percents'] + '.' + p.name;
      self._tokens.add(self.xformer ? self.xformer.pkgRef(str) : str);
      break;

      case 'e':;
      var args_tokens;
      args_tokens = new parser.TokenListBuilder(p.args, self.xformer).build();
      self._tokens.add(self.xformer ? (
        self.xformer.parentCall(args_tokens)
      ) : (
        ['^(', args_tokens, ')']
      ));
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
      self.addTypeObject(p);
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
parser.TokenListBuilder.prototype.addTypeObject = function(params) {
  var self = this;
  self._tokens.add(self.xformer ? self.xformer.cast(params.type) : params.tokens);
};


/**
 * @param {parser.TokenList|Array|Object|string} parsed
 * @param {LineTransformer=} xformer
 * @constructor
 * @extends {parser.TokenListBuilder}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
parser.ParamLineBuilder = function(parsed, xformer) {
  var self = this;
  parser.TokenListBuilder.call(this, parsed, xformer);
};
goog.inherits(parser.ParamLineBuilder, parser.TokenListBuilder);
parser.ParamLineBuilder.prototype._classname = 'parser.ParamLineBuilder';

/** @param {Object} params */
parser.ParamLineBuilder.prototype.addTypeObject = function(params) {
  var self = this;
  self._tokens.add(self.xformer ? self.xformer.type(params.type) : params.tokens);
};
/**
 * @param {FileScope} scope
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
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
 * @param {input.Line} header
 * @param {Array.<input.Line>} lines
 * @return {section.Code}
 */
section.Generator.prototype.generate = function(header, lines) {
  var self = this;
  var section;
  section = null;
  var header_line;
  header_line = header.line.substr(1);
  if (![
    self._createVariable,
    self._createCtor,
    self._createMethod,
    self._createAccessor,
    self._createMultiLineStr,
    self._createGlobalCode,
    self._createNativeCode,
    self._createAnonymousScope,
    self._createTypedef
  ].some(
  /** @param {Function} method */
  function(method) {
    section = method.call(self, header_line, header);
    if (section) {
      section.lines = lines;
      section.close(self._scope.context.fileName, self._scope.context.pkg);
      section.setType(self._scope.types);
    }
    return !!section;
  })) {
    error(header, 'line starts with colon and not a code section marker');
  }
  return section;
};

/**
 * @param {string} line
 * @param {input.Line} header
 * @return {section.Variable}
 * @private
 */
section.Generator.prototype._createVariable = function(line, header) {
  var self = this;
  var re;
  re = /^(\:{0,2})(\@?)\s*(\w+)\s*\=\s*(.*)$/.exec(line);
  if (!re) {
    return null;
  }

  var scope_level;
  scope_level = re[1].length;
  var is_private;
  is_private = !!re[2];
  var name;
  name = re[3];
  var rest;
  rest = re[4];

  if (scope_level === 2 && is_private) {
    error(header, 'global variable can not be private');
  }
  return new section.Variable(
    self._scope.copyContextWithName(name),
    header,
    scope_level,
    is_private,
    rest
  );
};

/**
 * @param {string} line
 * @return {section.Constructor}
 * @private
 */
section.Generator.prototype._createCtor = function(line) {
  var self = this;
  var re;
  re = /^\:\s*(\w*)\s*(\<\s*(.*\S))?$/.exec(line);
  if (!re) {
    return null;
  }

  // need to keep this in a member var too.
  self._scope.context.cls = new context.Class();
  var ctor;
  ctor = new section.Constructor(self._scope.copyContextWithName(re[1]), re[3]);
  self._scope.context.cls.ctor = ctor;
  self._scope.types.addCtor(ctor.name());
  if (re[3]) {
    self._scope.types.setParent(ctor.parentName());
  }
  return ctor;
};

/**
 * @param {string} line
 * @param {input.Line} header
 * @return {section.Method}
 * @private
 */
section.Generator.prototype._createMethod = function(line, header) {
  var self = this;
  var re;
  re = /^(\<?)(\@?)\s*([a-zA-Z]\w*)\s*(\\(.*)\\)?$/.exec(line);
  if (!re) {
    return null;
  }

  // we should have seen a ctor.
  if (!self._scope.context.cls) {
    error(header, 'method marker w/o class');
    return null;
  }
  return new section.Method(
      self._scope.copyContext(self._scope.context.cls.methodName((re[2] ? '_' : '') + re[3])),
      re[5],
      !!re[1]
  );
};

/**
 * @param {string} line
 * @param {input.Line} header
 * @return {section.Accessor}
 * @private
 */
section.Generator.prototype._createAccessor = function(line, header) {
  var self = this;
  var re;
  re = /^\s*([a-zA-Z]\w*)\s*([+*])\s*(\\(.*)\\)?$/.exec(line);
  if (!re) {
    return null;
  }

  // we should have seen a ctor.
  if (!self._scope.context.cls) {
    error(header, 'accessor marker w/o class');
    return null;
  }
  var name;
  name = re[1];
  var type;
  type = re[2];
  var ret_type;
  ret_type = re[4];
  var ctx;
  ctx = self._scope.copyContext(self._scope.context.cls.methodName(name));
  return new section.Accessor(ctx, name, ret_type, type === '+');
};

/**
 * @param {string} line
 * @return {section.Str}
 * @private
 */
section.Generator.prototype._createMultiLineStr = function(line) {
  var self = this;
  var re;
  re = /^'\s*(\w+)$/.exec(line);
  if (!re) {
    return null;
  }
  return new section.Str(self._scope.copyContextWithName(re[1]));
};

/**
 * @param {string} line
 * @return {section.Global}
 * @private
 */
section.Generator.prototype._createGlobalCode = function(line) {
  var self = this;
  return line === '' ? new section.Global() : null;
};

/**
 * @param {string} line
 * @return {section.Native}
 * @private
 */
section.Generator.prototype._createNativeCode = function(line) {
  var self = this;
  return line === '~' ? new section.Native() : null;
};

/**
 * @param {string} line
 * @return {section.Scope}
 * @private
 */
section.Generator.prototype._createAnonymousScope = function(line) {
  var self = this;
  return line === '##' ? new section.Scope() : null;
};

/**
 * @param {string} line
 * @return {section.Typedef}
 * @private
 */
section.Generator.prototype._createTypedef = function(line) {
  var self = this;
  var re;
  re = /^\!\s*(\w+)$/.exec(line);
  if (!re) {
    return null;
  }
  return new section.Typedef(self._scope.copyContextWithName(re[1]));
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
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
section.Head.prototype.addBlock = function(block) {
  var self = this;
  self._blocks.push(block);
};

/** @return {number} */
section.Head.prototype.numBlocks = function() {
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
section.Head.prototype.lastBlock = function() {
  var self = this;
  return self._blocks[self._blocks.length - 1];
};

/*
Do all the work necessary to produce code output.
*/
section.Head.prototype.transform = function() {
var self = this;
};

/*
Needs to be overridden.
*/
section.Head.prototype.output = function() {
  var self = this;
  return [];
};
/**
 * @param {string} name
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
type.Callable = function(name) {
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
   * @type {Array.<type.Callable>}
   * @private
   */
  this._methods = ([]);
  /**
   * @type {Array.<string|null>}
   * @private
   */
  this._args = ([]);
};
type.Callable.prototype._classname = 'type.Callable';
/** @type {string} */
type.Callable.prototype.parent;
type.Callable.prototype.__defineGetter__('parent', function() {
return this._parent;
});
type.Callable.prototype.__defineSetter__('parent', function(value) {
this._parent = value;
});

/** @param {string} name */
type.Callable.prototype.addMethod = function(name) {
  var self = this;
  var m;
  m = new type.Callable(name);
  self._methods.push(m);
  return m;
};

/** @param {string|null} arg */
type.Callable.prototype.addArg = function(arg) {
  var self = this;
  self._args.push(arg);
};

/** @return {Object} */
type.Callable.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {'name': self._name, 'args': self._args};
  if (self._parent) {
    obj['parent'] = self._parent;
  }
  if (self._methods) {
    obj['methods'] = self._methods.map(
    /** @param {type.Callable} m */
    function(m) {
      return m.extract();
    });
  }
  return obj;
};
/**
 * @param {!context.Package} pkg
 * @param {string} type
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
type.Decoder = function(pkg, type) {
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
type.Decoder.prototype._classname = 'type.Decoder';

/** @private */
type.Decoder.prototype._process = function() {
  var self = this;
  self._decoded = self._pkg.replaceStr(self._type);
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
type.Decoder.prototype.output = function() {
  var self = this;
  return self._decoded;
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
type.Set = function() {
  var self = this;
  /**
   * @type {type.Callable}
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
type.Set.prototype._classname = 'type.Set';

/**
 * @param {string} name
 * @return {type.Callable}
 */
type.Set.prototype.addCtor = function(name) {
  var self = this;
  self._ctor = new type.Callable(name);
  self._classes.push(self._ctor);
  return self._ctor;
};

/**
 * @param {string} name
 * @return {type.Callable}
 */
type.Set.prototype.addFunct = function(name) {
  var self = this;
  var fn;
  fn = new type.Callable(name);
  self._functs.push(fn);
  return fn;
};

/** @return {type.Callable} */
type.Set.prototype.getCurrentCtor = function() {
  var self = this;
  return self._ctor;
};

/** @param {string} parent_name */
type.Set.prototype.setParent = function(parent_name) {
  var self = this;
  if (!self._ctor) {
    throw 'set parent called w/o ctor.';
  }
  self._ctor.parent = parent_name;
};

/** @return {Object} */
type.Set.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {};
  if (self._classes) {
    obj['cls'] = self._classes.map(
    /** @param {type.Set} cls */
    function(cls) {
      return cls.extract();
    });
  }
  if (self._functs) {
    obj['fns'] = self._functs.map(
    /** @param {type.Callable} fn */
    function(fn) {
      return fn.extract();
    });
  }
  return obj;
};
var CODE_PARSER = null;

/**
 * @param {!context.Context} context
 * @param {input.Line} input
 * @param {LineParser} lineParsed
 * @constructor
 * @extends {section.Head}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
var CodeLine = function(context, input, lineParsed) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {input.Line}
   * @private
   */
  this._input = input;
  /**
   * @type {LineParser}
   * @private
   */
  this._lineParsed = lineParsed;
  /**
   * @type {parser.Result}
   * @private
   */
  this._parsed = (null);
  /**
   * @type {!Array.<!CodeLine>}
   * @private
   */
  this._continueLines = ([]);
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
goog.inherits(CodeLine, section.Head);
CodeLine.prototype._classname = 'CodeLine';
/** @type {input.Line} */
CodeLine.prototype.input;
CodeLine.prototype.__defineGetter__('input', function() {
return this._input;
});
/** @type {!Array.<!CodeLine>} */
CodeLine.prototype.continueLines;
CodeLine.prototype.__defineGetter__('continueLines', function() {
return this._continueLines;
});
CodeLine.prototype.__defineSetter__('continueLines', function(value) {
this._continueLines = value;
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
  return self._lineParsed.indent;
});

/** @type {boolean} */
CodeLine.prototype.isContinuation;
CodeLine.prototype.__defineGetter__('isContinuation', function() {
  var self = this;
  return self._lineParsed.isContinuation;
});

/** @type {boolean} */
CodeLine.prototype.isBlockStatement;
CodeLine.prototype.__defineGetter__('isBlockStatement', function() {
  var self = this;
  return self._matcher.isBlockStatement;
});

/** @type {parser.Result} */
CodeLine.prototype.parsed;
CodeLine.prototype.__defineGetter__('parsed', function() {
  var self = this;
  if (self.isContinuation) {
    error(self._input, 'parse requested for cont. line');
  }
  if (!self._parsed) {
    // TODO: need to use different parsing targets.
    // e.g. parameter init and section.Variable need to be parsed as rhs value.
    CODE_PARSER = CODE_PARSER || new parser.Target('ParseLine');
    var lines;
    lines = [self._input].concat(self._continueLines);
    try {
      self._parsed = CODE_PARSER.run(
        lines,
        new LineTransformer(self._context, self._input)
      );
    }
    catch (e) {
      error(self._input, '(syntax error) ' + e.message, e.contextLines);
    }
  }
  return self._parsed;
});

CodeLine.prototype.transform = function() {
  var self = this;
  var code;
  code = (self._param && self._param !== true && self._param.valueLine) || self.parsed.code;

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

  out.lines.appendLines(self.parsed.prevLines.map(
  /** @param {string} line */
  function(line) {
    return line + ';';
  }));
  self._matcher.output(out);
  if (self._param) {
    self._param.outputInit(out);
  }
  self.parsed.tailComment.forEach(
  /** @param {string} comment */
  function(comment) {
    out.tailComment.push(comment);
  });
  return out;
};
/**
 * @constructor
 * @extends {section.Head}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Code = function() {
  var self = this;
  /**
   * @type {Array.<input.Line>}
   * @private
   */
  this._lines = ([]);
  section.Head.call(this);
};
goog.inherits(section.Code, section.Head);
section.Code.prototype._classname = 'section.Code';
/** @type {Array.<input.Line>} */
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
/**
 * @param {string} file_name
 * @param {!context.Package=} pkg
 */
section.Code.prototype.close = function(file_name, pkg) {
  var self = this;
};

/** @param {type.Set} types */
section.Code.prototype.setType = function(types) {
  var self = this;
};
/**
 * @constructor
 * @extends {section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Native = function() {
  var self = this;
  section.Code.call(this);
};
goog.inherits(section.Native, section.Code);
section.Native.prototype._classname = 'section.Native';

/** @return {Array.<output.Line>} */
section.Native.prototype.output = function() {
  var self = this;
  return self.lines.map(
  /** @param {input.Line} line */
  function(line) {
    var out;
    out = new output.Line(line);
    out.appendLine(line.trim);
    return out;
  });
};
/**
 * @constructor
 * @extends {section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Runnable = function() {
  var self = this;
  section.Code.call(this);
};
goog.inherits(section.Runnable, section.Code);
section.Runnable.prototype._classname = 'section.Runnable';

/** @override */
section.Runnable.prototype.close = function(file_name, pkg) {
  var self = this;
  // TODO: necessary to create a new instance of context here?
  // take one in ctor like Callable?
  var c;
  c = new CodeScope(new context.Context(
    file_name,
    pkg || new context.Package('')
  ), self);
  c.process(self.lines);
};

/** @override */
section.Runnable.prototype.transform = function() {
  var self = this;
  assert(
    self.numBlocks() === 1,
    self.lines[0],
    'Runnable has ' + self.numBlocks() + ' blocks'
  );
  self.block(0).transform();
};

/**
 * @param {string} block_suffix
 * @return {Array.<output.Line>}
 */
section.Runnable.prototype.outputBody = function(block_suffix) {
  var self = this;
  var lines;
  lines = [];
  var body_lines;
  body_lines = self.lastBlock().output();
  if (block_suffix) {
    body_lines.suffix = block_suffix;
  }
  if (!body_lines.isEmpty) {
    lines.push(body_lines);
  }
  return lines;
};
/**
 * @param {!context.Context} context
 * @constructor
 * @extends {section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
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
goog.inherits(section.Str, section.Code);
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
  /** @param {input.Line} line */
  function(line) {
    if (line.isBlank) {
      // empty line is fine.
      result.push('');
      return;
    }
    if (self._indent < 0) {
      self._indent = line.indent;
    }
    else if (line.indent < self._indent) {
      error(line, 'inconsistent indentation');
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
    self._context.name.decl + ' =',
    lines.map(
    /**
     * @param {string} line
     * @param {number} i
     */
    function(line, i) {
      var out;
      out = new output.Line(self.lines[i]);
      out.indent = self._indent;
      out.appendLine("'" + line + "\\n'" + (i === lines.length - 1 ? ';' : ' +'));
      return out;
    })
  ];
};
/**
 * @param {!context.Context} context
 * @param {input.Line} line
 * @param {number} scopeLevel
 * @param {boolean} isPrivate
 * @param {string} rhs
 * @constructor
 * @extends {section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Variable = function(context, line, scopeLevel, isPrivate, rhs) {
  var self = this;
  /**
   * @type {!context.Context}
   * @private
   */
  this._context = context;
  /**
   * @type {input.Line}
   * @private
   */
  this._line = line;
  /**
   * @type {number}
   * @private
   */
  this._scopeLevel = scopeLevel;
  /**
   * @type {boolean}
   * @private
   */
  this._isPrivate = isPrivate;
  /**
   * @type {CodeLine}
   * @private
   */
  this._codeLine = (null);
  section.Code.call(this);
  var code_input;
  code_input = new input.Line(self._line.file, rhs, self._line.rowIndex);
  self._codeLine = new CodeLine(self._context, code_input, new LineParser(code_input));
};
goog.inherits(section.Variable, section.Code);
section.Variable.prototype._classname = 'section.Variable';

/** @override */
section.Variable.prototype.close = function() {
  var self = this;
  var c;
  c = new CodeScope(self._context, self);
  c.process(self.lines);
};

/** @override */
section.Variable.prototype.transform = function() {
  var self = this;
  self.blocks.forEach(
  /** @param {IndentBlock} block */
  function(block) {
    if (block.hasValidLine) {
      self._codeLine.addBlock(block);
    }
  });
  self._codeLine.transform();
};

/** @return {Array} */
section.Variable.prototype.output = function() {
  var self = this;
  if (self._scopeLevel === 0 && !self._context.cls) {
    error(self._line, 'class scope outside of class.');
  }
  var out;
  out = self._codeLine.output();
  out.linePrefix = self._context.scopedName(self._scopeLevel).decl + ' = ' + out.linePrefix;
  out.lineSuffix += ';';
  return [out.output, self.blocks.map(
  /** @param {IndentBlock} block */
  function(block) {
    return block.hasValidLine ? [] : block.output();
  })];
};
/**
 * @param {!context.Context} context
 * @param {string} returnType
 * @constructor
 * @extends {section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Callable = function(context, returnType) {
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
  this._returnType = returnType;
  /**
   * @type {ParamSet}
   * @private
   */
  this._params = (null);
  section.Runnable.call(this);
};
goog.inherits(section.Callable, section.Runnable);
section.Callable.prototype._classname = 'section.Callable';
/** @type {!context.Context} */
section.Callable.prototype.context;
section.Callable.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {string} */
section.Callable.prototype.returnType;
section.Callable.prototype.__defineGetter__('returnType', function() {
return this._returnType;
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
  return self._context.name.ref;
};

/** @override */
section.Callable.prototype.close = function() {
  var self = this;
  var c;
  c = new CodeScope(self._context, self);
  c.process(self.lines);
};

/** @override */
section.Callable.prototype.transform = function() {
  var self = this;
  assert(
    self.numBlocks() === 1,
    self.lines[0],
    'callable takes 1 block -- found ' + self.numBlocks()
  );
  self._params = new ParamSet(self._context, self.block(0));
  self._params.transform();
  self._params.setReturnType(self._returnType);
  self.block(0).transform();
};

/** @return {string} */
section.Callable.prototype.outputFunc = function() {
  var self = this;
  return self._context.name.decl + ' = function(' + self._params.outputParams() + ') {';
};
/**
 * @constructor
 * @extends {section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Global = function() {
  var self = this;
  section.Runnable.call(this);
};
goog.inherits(section.Global, section.Runnable);
section.Global.prototype._classname = 'section.Global';

/** @return {Array} */
section.Global.prototype.output = function() {
  var self = this;
  return self.outputBody('');
};
/**
 * @constructor
 * @extends {section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Scope = function() {
  var self = this;
  section.Runnable.call(this);
};
goog.inherits(section.Scope, section.Runnable);
section.Scope.prototype._classname = 'section.Scope';

/** @return {Array} */
section.Scope.prototype.output = function() {
  var self = this;
  return ['(function() {', self.outputBody('})();')];
};
/**
 * @param {!context.Context} context
 * @constructor
 * @extends {section.Str}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Typedef = function(context) {
  var self = this;
  section.Str.call(this, context);
};
goog.inherits(section.Typedef, section.Str);
section.Typedef.prototype._classname = 'section.Typedef';

/** @return {Array.<output.Line>} */
section.Typedef.prototype.output = function() {
  var self = this;
  var decoder;
  decoder = new type.Decoder(self.context.pkg, self.strlines().join(''));
  var out;
  out = new output.Line(self.lines[0]);
  out.indent = 0;
  out.lines.appendLines([
    docLines(['@typedef {' + decoder.output() + '}']),
    self.context.name.decl + ';'
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
 * @param {boolean} isGetter
 * @constructor
 * @extends {section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Accessor = function(context, name, return_type, isGetter) {
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
  this._isGetter = isGetter;
  context.isMethod = true;
  section.Callable.call(this, context, return_type);
};
goog.inherits(section.Accessor, section.Callable);
section.Accessor.prototype._classname = 'section.Accessor';

/** @return {Array} */
section.Accessor.prototype.output = function() {
  var self = this;
  var member;
  member = self.context.cls.member(self._name);
  // TODO: error if there is member and we have param or return type specified to the
  // accessor.
  // TODO: error if there is no member, but there are both getter and setter, and
  // their param and return type do not match. also error if the setter takes more
  // than one param (currently the check doesn't work if there's getter specified
  // before setter because getter adds a member and the 'member' var above is non-null
  // for the setter).
  if (!member) {
    // accessor with no corresponding member. use the given param and return types.
    if (self._isGetter && !self.returnType) {
      error(self.lines[0], 'getter with no return type');
    }
    if (!self._isGetter && self.params.numParams !== 1) {
      error(self.lines[0], 'non-member setter should have one param');
    }

    var member_type;
    member_type = self._isGetter ? (
      new type.Decoder(self.context.pkg, self.returnType)
    ) : (
      self.params.paramType(0)
    );
    member = self.context.cls.addMember(
      self._name,
      member_type,
      '&',
      true
    );
  }
  var class_name;
  class_name = self.context.cls.name();
  return [
    member.outputDecl(class_name),
    member.outputAccessor(class_name, self._isGetter, [
      whitespaces(self.block(0).indent) + 'var self = this;',
      self.outputBody('')
    ], self.params)
  ];
};
/**
 * @param {!context.Context} context
 * @param {string?=} opt_parent
 * @constructor
 * @extends {section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Constructor = function(context, opt_parent) {
  var self = this;
  /**
   * @type {string?}
   * @private
   */
  this._parent = opt_parent === undefined ? (null) : opt_parent;
  context.isCtor = true;
  section.Callable.call(this, context, '');
  self._parent = self._parent ? self.context.pkg.replace(self._parent) : '';
};
goog.inherits(section.Constructor, section.Callable);
section.Constructor.prototype._classname = 'section.Constructor';

/** @return {string} */
section.Constructor.prototype.parentName = function() {
  var self = this;
  return /** @type {string} */(self._parent);
};

/** @override */
section.Constructor.prototype.transform = function() {
  var self = this;
  assert(self.numBlocks() === 1, self.lines[0]);
  self.params = new ParamSet(self.context, self.block(0), true);
  self.params.transform();
  self.block(0).transform();
};

/** @return {Array} */
section.Constructor.prototype.output = function() {
  var self = this;
  var decl;
  decl = self.params.outputDecls();
  decl.push('@constructor');
  var inherit;
  inherit = [];
  if (self._parent) {
    decl.push('@extends {' + self._parent + '}');
    inherit.push([
      'goog.inherits(',
      self.context.name.ref,
      ', ',
      self._parent,
      ');'
    ].join(''));
  }
  decl.push('@struct');
  decl.push('@suppress {checkStructDictInheritance}');
  return [
    docLines(decl),
    self.outputFunc(),
    whitespaces(self.block(0).indent) + 'var self = this;',
    self.outputBody('};'),
    inherit,
    [
      self.context.name.property('_classname').decl,
      " = '",
      self.context.name.ref,
      "';"
    ].join(''),
    self.context.cls.outputAccessors()
  ];
};

/** @override */
section.Constructor.prototype.setType = function(types) {
  var self = this;
  self.params.setArgTypes(types.getCurrentCtor());
};
/**
 * @param {!context.Context} context
 * @param {string} return_type
 * @param {boolean} overriding
 * @constructor
 * @extends {section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
section.Method = function(context, return_type, overriding) {
  var self = this;
  /**
   * @type {boolean}
   * @private
   */
  this._overriding = overriding;
  context.isMethod = true;
  section.Callable.call(this, context, return_type);
};
goog.inherits(section.Method, section.Callable);
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
    decls = self.params.outputDecls();
  }
  if (/^_/.test(self.context.name.id)) {
    decls.push('@private');
  }
  return [
    docLines(decls),
    self.outputFunc(),
    whitespaces(self.block(0).indent) + 'var self = this;',
    self.outputBody('};')
  ];
};

/** @override */
section.Method.prototype.setType = function(types) {
  var self = this;
  self.params.setArgTypes(
    types.getCurrentCtor().addMethod(self.context.name.id)
  );
};
