var _o_ = {};
_o_.context = {};
_o_.input = {};
_o_.output = {};
_o_.parser = {};
_o_.re = {};
_o_.section = {};
_o_.type = {};

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
   * @param {!Object} childCtor
   * @param {!Object} parentCtor
   */
  function(childCtor, parentCtor) {
    childCtor.prototype = Object.create(parentCtor.prototype);
  };
_o_.COMPILED_PKGS_BASE = '_o_.';
/*
Match markers and blocks.
*/

/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @param {!Array.<!_o_.parser.BlockMarker|string>} code
 * @param {!Array.<!_o_.IndentBlock>} blocks
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.BlockMatcher = function(context, input, code, blocks) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {!Array.<!_o_.parser.BlockMarker|string>} */
  this._code = code;
  /** @private {!Array.<!_o_.IndentBlock>} */
  this._blocks = blocks;
  /** @private {!Array.<!_o_.ParamSet>} */
  this._params = ([]);
  /** @private {boolean} */
  this._isBlockStatement = (false);
};
_o_.BlockMatcher.prototype._classname = '_o_.BlockMatcher';
/** @type {boolean} */
_o_.BlockMatcher.prototype.isBlockStatement;
_o_.BlockMatcher.prototype.__defineGetter__('isBlockStatement', function() {
return this._isBlockStatement;
});

_o_.BlockMatcher.prototype.transform = function() {
  var self = this;
  self._matchBlocks();
  self._transformBlocks();
};

/*
Returns true only if matching succeeds.
*/
/** @private */
_o_.BlockMatcher.prototype._matchBlocks = function() {
  var self = this;
  var itr;
  itr = new _o_.CodeBlockItr(self._input, self._code, self._blocks);
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
      param = new _o_.ParamSet(sub_context, self._blocks[itr.bidx]);
      self._params.push(param);
    }
  };
  itr.run();
  self._isBlockStatement = itr.isBlockStatement;
};

/** @private */
_o_.BlockMatcher.prototype._transformBlocks = function() {
  var self = this;
  var itr;
  itr = new _o_.CodeBlockItr(self._input, self._code, self._blocks);
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

/** @param {!_o_.output.Line} out */
_o_.BlockMatcher.prototype.output = function(out) {
  var self = this;
  var itr;
  itr = new _o_.CodeBlockItr(self._input, self._code, self._blocks);
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
 * @param {!_o_.output.Line} out
 * @param {!_o_.ParamSet} param
 * @private
 */
_o_.BlockMatcher.prototype._outputParams = function(out, param) {
  var self = this;
  if (param.isDeclEmpty()) {
    out.lines.appendStr('function(' + param.outputParams() + ')');
  }
  else {
    // we don't try to merge the frg into first line.
    out.lines.terminateLine();
    out.lines.appendLines(_o_.docLines(param.outputDecls()));
    out.lines.appendStr('function(' + param.outputParams() + ')');
  }
};
/**
 * @param {!_o_.input.Line} input
 * @param {!Array.<!_o_.parser.BlockMarker|string>} code
 * @param {!Array.<!_o_.IndentBlock>} blocks
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.CodeBlockItr = function(input, code, blocks) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {!Array.<!_o_.parser.BlockMarker|string>} */
  this._code = code;
  /** @private {!Array.<!_o_.IndentBlock>} */
  this._blocks = blocks;
  /** @private {function(string,boolean)|null} */
  this._blockCb = (null);
  /** @private {function()|null} */
  this._codeCb = (null);
  /** @private {number} */
  this._cidx = (0);
  /** @private {number} */
  this._bidx = (0);
  /** @private {number} */
  this._lidx = (0);
  /** @private {number} */
  this._pidx = (0);
  /** @private {boolean} */
  this._isBlockStatement = (false);
};
_o_.CodeBlockItr.prototype._classname = '_o_.CodeBlockItr';
/** @type {function(string,boolean)|null} */
_o_.CodeBlockItr.prototype.blockCb;
_o_.CodeBlockItr.prototype.__defineGetter__('blockCb', function() {
return this._blockCb;
});
_o_.CodeBlockItr.prototype.__defineSetter__('blockCb', function(value) {
this._blockCb = value;
});
/** @type {function()|null} */
_o_.CodeBlockItr.prototype.codeCb;
_o_.CodeBlockItr.prototype.__defineGetter__('codeCb', function() {
return this._codeCb;
});
_o_.CodeBlockItr.prototype.__defineSetter__('codeCb', function(value) {
this._codeCb = value;
});
/** @type {number} */
_o_.CodeBlockItr.prototype.cidx;
_o_.CodeBlockItr.prototype.__defineGetter__('cidx', function() {
return this._cidx;
});
/** @type {number} */
_o_.CodeBlockItr.prototype.bidx;
_o_.CodeBlockItr.prototype.__defineGetter__('bidx', function() {
return this._bidx;
});
/** @type {number} */
_o_.CodeBlockItr.prototype.lidx;
_o_.CodeBlockItr.prototype.__defineGetter__('lidx', function() {
return this._lidx;
});
/** @type {number} */
_o_.CodeBlockItr.prototype.pidx;
_o_.CodeBlockItr.prototype.__defineGetter__('pidx', function() {
return this._pidx;
});
/** @type {boolean} */
_o_.CodeBlockItr.prototype.isBlockStatement;
_o_.CodeBlockItr.prototype.__defineGetter__('isBlockStatement', function() {
return this._isBlockStatement;
});

_o_.CodeBlockItr.prototype.run = function() {
  var self = this;
  self._code.forEach(
  /**
   * @param {!_o_.parser.BlockMarker|string} frg
   * @param {number} i
   */
  function(frg, i) {
    self._cidx = i;
    if (frg instanceof _o_.parser.BlockMarker) {
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
    _o_.error(self._input, (
      ('# of blocks does not match # of markers: ') +
      (self._bidx) +
      (', ') +
      (self._blocks.length)
    ));
  }
};

/**
 * @param {!_o_.parser.BlockMarker} marker
 * @private
 */
_o_.CodeBlockItr.prototype._handleMarker = function(marker) {
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
 * @param {!_o_.context.Context} context
 * @param {!_o_.section.Head} head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.CodeParser = function(context, head) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.section.Head} */
  this._head = head;
  /** @private {!Array.<!_o_.IndentBlock>} */
  this._blocks = ([]);
  /** @private {!_o_.CodeLine|null} */
  this._lastValidLine = (null);
  /** @private {!Array.<!_o_.SectionLine>|null} */
  this._invalidLines = ([]);
};
_o_.CodeParser.prototype._classname = '_o_.CodeParser';

/** @param {!Array.<!_o_.input.Line>} input_lines */
_o_.CodeParser.prototype.parse = function(input_lines) {
  var self = this;
  self._process(input_lines);
  if (!input_lines.length) {
    return;
  }
  _o_.assert(
    self._blocks.length <= 1,
    input_lines[0],
    'block stack depth: ' + self._blocks.length
  );
};

/**
 * @param {!Array.<!_o_.input.Line>} input_lines
 * @private
 */
_o_.CodeParser.prototype._process = function(input_lines) {
  var self = this;
  var first_line_indent;
  first_line_indent = 0;
  var code_lines;
  code_lines = self._makeCodeLines(input_lines);
  code_lines.some(
  /** @param {!_o_.SectionLine|null} line */
  function(line) {
    if (!(line instanceof _o_.InvalidLine)) {
      first_line_indent = line.indent;
      return (true);
    }
    return (false);
  });
  self._blocks = [new _o_.IndentBlock(0, first_line_indent, self._head)];
  self._head.addBlock(self._blocks[0]);

  code_lines.forEach(
  /**
   * @param {!_o_.SectionLine|null} line
   * @param {number} i
   */
  function(line, i) {
    // create blocks and assign lines to them.
    if (line instanceof _o_.InvalidLine) {
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
    else if (line instanceof _o_.SeparatorLine) {
      self._separator(line, indent, i);
    }
    else {
      self._lastValidLine = /** @type {!_o_.CodeLine} */(line);
      self._topBlock().add(line);
    }
  });
  self._addInvalidLines();
  self._popRest();
};

/**
 * @param {!Array.<!_o_.input.Line>} input_lines
 * @return {!Array.<!_o_.SectionLine>}
 * @private
 */
_o_.CodeParser.prototype._makeCodeLines = function(input_lines) {
  var self = this;
  var cat;
  cat = new _o_.LineCategorizer(self._context);
  return (input_lines.map(
  /** @param {!_o_.input.Line} line */
  function(line) {
    return (cat.createLine(line));
  }));
};

/**
 * @param {number} i
 * @param {number} indent
 * @private
 */
_o_.CodeParser.prototype._deeperIndent = function(i, indent) {
  var self = this;
  // push a new block in the stack.
  var b;
  b = new _o_.IndentBlock(i, indent, self._lastValidLine);
  self._lastValidLine.addBlock(b);
  self._blocks.push(b);
};

/**
 * @param {!_o_.SectionLine} line
 * @param {number} i
 * @private
 */
_o_.CodeParser.prototype._shallowerIndent = function(line, i) {
  var self = this;
  // back up levels.
  while (line.indent < self._topBlock().indent) {
    self._blocks.pop();
    _o_.assert(
      self._blocks.length >= 1,
      line.input,
      'stack size zero (line ' + (i + 1) + '): ' + line.str
    );
  }
  if (line.indent > self._topBlock().indent) {
    _o_.error(line.input, 'indent level does not match');
  }
};

/**
 * @param {!_o_.SectionLine} line
 * @param {number} indent
 * @param {number} i
 * @private
 */
_o_.CodeParser.prototype._separator = function(line, indent, i) {
  var self = this;
  var prev_b;
  prev_b = self._blocks.pop();
  var b;
  b = new _o_.IndentBlock(i, indent, prev_b.head());
  prev_b.head().addBlock(b);
  self._blocks.push(b);
};

/**
 * @param {!_o_.SectionLine} line
 * @param {number} i
 * @private
 */
_o_.CodeParser.prototype._continuation = function(line, i) {
  var self = this;
  var last_line;
  last_line = self._topBlock().lastLine();
  if (!last_line) {
    _o_.error(line.input, 'continuation as a first line of block');
  }
  else {
    last_line.continueLines.push(new _o_.input.Line(
      self._context.fileName,
      line.input.line.replace(/\|/, ' '),
      line.input.rowIndex
    ));
  }
  self._lastValidLine = /** @type {!_o_.CodeLine} */(line);
};

/** @private */
_o_.CodeParser.prototype._addInvalidLines = function() {
  var self = this;
  var top_block;
  top_block = self._topBlock();
  self._invalidLines.forEach(
  /** @param {!_o_.SectionLine} line */
  function(line) {
    top_block.add(line);
  });
  self._invalidLines = [];
};

/** @private */
_o_.CodeParser.prototype._popRest = function() {
  var self = this;
  // pop all the rest of blocks except one.
  while (self._blocks.length > 1) {
    self._blocks.pop();
  }
};

/** @private */
_o_.CodeParser.prototype._topBlock = function() {
  var self = this;
  // there should be at least the root block.
  return (self._blocks[self._blocks.length - 1]);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.section.Head=} opt_head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.CodeScope = function(context, opt_head) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.section.Head} */
  this._head = opt_head === undefined ? (new _o_.section.Global()) : opt_head;
};
_o_.CodeScope.prototype._classname = '_o_.CodeScope';

/** @param {!Array.<string>} lines */
_o_.CodeScope.prototype.processLines = function(lines) {
  var self = this;
  var i;
  i = 0;
  self.process(lines.map(
  /** @param {string} line */
  function(line) {
    return (new _o_.input.Line(self._context.fileName, line, i++));
  }));
};

/** @param {!Array.<!_o_.input.Line>} input_lines */
_o_.CodeScope.prototype.process = function(input_lines) {
  var self = this;
  new _o_.CodeParser(self._context, self._head).parse(input_lines);
  self._head.transform();
};

_o_.CodeScope.prototype.output = function() {
  var self = this;
  return (_o_.arrFlatten(self._head.output()).map(
  /** @param {string} line */
  function(line) {
    return (line.replace(/\s*$/, ''));
  }));
};
/*
parse file scope and separate code sections from comments.
*/
/** @typedef {!_o_.input.Comment|!_o_.section.Code} */
_o_.OutputSection;

/**
 * @param {string} file_name
 * @param {string} pkg_name
 * @param {string} defaultClsName
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.FileScope = function(file_name, pkg_name, defaultClsName) {
  var self = this;
  /** @private {string} */
  this._defaultClsName = defaultClsName;
  /** @private {!_o_.context.Context} */
  this._context = (new _o_.context.Context(
    file_name,
    new _o_.context.Package(_o_.COMPILED_PKGS_BASE + pkg_name)
  ));
  /** @private {!_o_.type.Set} */
  this._types = (new _o_.type.Set());
  /** @private {!Array.<!_o_.OutputSection>|null} */
  this._list = (null);

  self._context.isFileScope = true;
};
_o_.FileScope.prototype._classname = '_o_.FileScope';
/** @type {!_o_.context.Context} */
_o_.FileScope.prototype.context;
_o_.FileScope.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {!_o_.type.Set} */
_o_.FileScope.prototype.types;
_o_.FileScope.prototype.__defineGetter__('types', function() {
return this._types;
});

/** @param {!Array.<string>} line */
_o_.FileScope.prototype.processLines = function(line) {
  var self = this;
  var gen;
  gen = new _o_.section.Generator(self);
  var input_list;
  input_list = new _o_.input.File(self._context.fileName, line).parse();
  self._list = input_list.map(
  /**
   * @param {!_o_.input.Comment|!_o_.input.Section} section
   * @param {number} index
   */
  function(section, index) {
    // convert input.Section to section.Code and leave input.Comment as is.
    return (section instanceof _o_.input.Section ? gen.generate(
      section.header,
      section.lines
    ) : section);
  });
};

/**
 * @param {!_o_.context.Name} name
 * @return {!_o_.context.Context}
 */
_o_.FileScope.prototype.copyContext = function(name) {
  var self = this;
  var ctxt;
  ctxt = self._context.clone();
  ctxt.name = name;
  ctxt.cls = self._context.cls;
  ctxt.isFileScope = self._context.isFileScope;
  return (ctxt);
};

/**
 * @param {string} name
 * @return {!_o_.context.Context}
 */
_o_.FileScope.prototype.copyContextWithName = function(name) {
  var self = this;
  var cls_name;
  cls_name = name || self._defaultClsName;
  var fullname;
  fullname = new _o_.context.Name(self._context.pkg, cls_name);
  return (self.copyContext(fullname));
};

/** @return {!Array.<string>} */
_o_.FileScope.prototype.output = function() {
  var self = this;
  return (_o_.arrFlatten(self._list.map(
  /** @param {!_o_.OutputSection} elem */
  function(elem) {
    return (elem.output());
  })));
};
/**
 * @param {number} lineNo
 * @param {number} indent
 * @param {!_o_.section.Head|null} head
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.IndentBlock = function(lineNo, indent, head) {
  var self = this;
  /** @private {number} */
  this._lineNo = lineNo;
  /** @private {number} */
  this._indent = indent;
  /** @private {!_o_.section.Head|null} */
  this._head = head;
  /** @private {!Array.<!_o_.SectionLine>} */
  this._lines = ([]);
  // TODO: type to BlockType when it's enum.
  /** @private {number} */
  this._marker = (BlockType.BLOCK);
};
_o_.IndentBlock.prototype._classname = '_o_.IndentBlock';
/** @type {number} */
_o_.IndentBlock.prototype.lineNo;
_o_.IndentBlock.prototype.__defineGetter__('lineNo', function() {
return this._lineNo;
});
/** @type {number} */
_o_.IndentBlock.prototype.indent;
_o_.IndentBlock.prototype.__defineGetter__('indent', function() {
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

/** @param {!_o_.SectionLine} line */
_o_.IndentBlock.prototype.add = function(line) {
  var self = this;
  self._lines.push(line);
};

_o_.IndentBlock.prototype.lastLine = function() {
  var self = this;
  return (self._lines[self._lines.length - 1]);
};

/**
 * @param {function(!_o_.SectionLine,number)} cb
 * @param {!Object} ctxt
 */
_o_.IndentBlock.prototype.eachLine = function(cb, ctxt) {
  var self = this;
  self._lines.forEach(cb, ctxt);
};

_o_.IndentBlock.prototype.head = function() {
  var self = this;
  return (self._head);
};

/*
TODO: change marker's type to BlockType when it's enum.
*/
/** @param {number=} marker */
_o_.IndentBlock.prototype.transform = function(marker) {
  var self = this;
  if (marker !== undefined) {
    self._marker = marker;
  }
  self._lines.forEach(
  /** @param {!_o_.SectionLine} line */
  function(line) {
    if (!(line instanceof _o_.InvalidLine)) {
      line.transform();
    }
  });
};

/** @type {string} */
_o_.IndentBlock.prototype.startStr;
_o_.IndentBlock.prototype.__defineGetter__('startStr', function() {
  var self = this;
  // string to open the block.
  return (_BLOCK_OPEN[self._marker]);
});

/** @type {string} */
_o_.IndentBlock.prototype.endStr;
_o_.IndentBlock.prototype.__defineGetter__('endStr', function() {
  var self = this;
  return (_BLOCK_CLOSE[self._marker]);
});

/** @type {boolean} */
_o_.IndentBlock.prototype.hasValidLine;
_o_.IndentBlock.prototype.__defineGetter__('hasValidLine', function() {
  var self = this;
  return (self._lines.some(
  /** @param {!_o_.SectionLine} line */
  function(line) {
    return (!(line instanceof _o_.InvalidLine));
  }));
});

/**
 * @param {number=} line_index
 * @return {!_o_.output.Block}
 */
_o_.IndentBlock.prototype.output = function(line_index) {
  var self = this;
  // find the last valid line.
  var last_index;
  last_index = -1;
  self._lines.forEach(
  /**
   * @param {!_o_.SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    if (!(line instanceof _o_.InvalidLine) && !line.param) {
      last_index = i;
    }
  });
  _o_.assert(
    (
      (last_index >= 0) ||
      (self._marker === BlockType.BLOCK) ||
      (self._marker === BlockType.FUNCTION)
    ),
    self._lines.length ? self._lines[0].input : _o_.input.UnknownInputLine,
    'block with no valid lines.'
  );

  var out;
  out = new _o_.output.Block();
  var accum_suffix;
  accum_suffix = '';
  var valid_line_count;
  valid_line_count = 0;
  self._lines.forEach(
  /**
   * @param {!_o_.SectionLine} line
   * @param {number} i
   */
  function(line, i) {
    if (!(line instanceof _o_.InvalidLine) && !line.param) {
      valid_line_count++;
    }
    if (line_index !== undefined && line_index + 1 !== valid_line_count) {
      return;
    }
    var out_line;
    out_line = line.output();
    if (line instanceof _o_.InvalidLine || out_line.empty) {
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
  return (out);
};
/*
either blank line or comment only line.
*/
/**
 * @param {!_o_.input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.InvalidLine = function(input) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._input = input;
};
_o_.InvalidLine.prototype._classname = '_o_.InvalidLine';
/** @type {!_o_.input.Line} */
_o_.InvalidLine.prototype.input;
_o_.InvalidLine.prototype.__defineGetter__('input', function() {
return this._input;
});

/** @type {string} */
_o_.InvalidLine.prototype.str;
_o_.InvalidLine.prototype.__defineGetter__('str', function() {
  var self = this;
  return (self._input.line);
});

/** @return {!_o_.output.Line} */
_o_.InvalidLine.prototype.output = function() {
  var self = this;
  var out;
  out = new _o_.output.Line(self._input);
  out.appendLine(self._input.trim);
  return (out);
};
/** @typedef {!_o_.CodeLine|!_o_.SeparatorLine|!_o_.InvalidLine} */
_o_.SectionLine;

/**
 * @param {!_o_.context.Context} context
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.LineCategorizer = function(context) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
};
_o_.LineCategorizer.prototype._classname = '_o_.LineCategorizer';

/**
 * @param {!_o_.input.Line} line
 * @return {!_o_.SectionLine}
 */
_o_.LineCategorizer.prototype.createLine = function(line) {
  var self = this;
  var parsed;
  parsed = new _o_.LineParser(line);
  if (!parsed.isValid) {
    return (new _o_.InvalidLine(line));
  }
  if (parsed.isSeparator) {
    return (new _o_.SeparatorLine(line, parsed));
  }
  return (new _o_.CodeLine(self._context, line, parsed));
};
/*
First pass line parsing for constructing the block structure.
*/
/**
 * @param {!_o_.input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.LineParser = function(input) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._input = input;

  /** @private {boolean} */
  this._isValid = (false);
  /** @private {number} */
  this._indent = (0);
  /** @private {boolean} */
  this._isContinuation = (false);
  /** @private {boolean} */
  this._isSeparator = (false);

  self._process();
};
_o_.LineParser.prototype._classname = '_o_.LineParser';
/** @type {boolean} */
_o_.LineParser.prototype.isValid;
_o_.LineParser.prototype.__defineGetter__('isValid', function() {
return this._isValid;
});
/** @type {number} */
_o_.LineParser.prototype.indent;
_o_.LineParser.prototype.__defineGetter__('indent', function() {
return this._indent;
});
/** @type {boolean} */
_o_.LineParser.prototype.isContinuation;
_o_.LineParser.prototype.__defineGetter__('isContinuation', function() {
return this._isContinuation;
});
/** @type {boolean} */
_o_.LineParser.prototype.isSeparator;
_o_.LineParser.prototype.__defineGetter__('isSeparator', function() {
return this._isSeparator;
});

/** @private */
_o_.LineParser.prototype._process = function() {
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
_o_.LineParser.prototype._checkSpaces = function() {
  var self = this;
  var spaces_re;
  spaces_re = /^(\s*)(.*[\S])(\s*)$/.exec(self._input.line);

  self._indent = spaces_re[1].length;
  if (!/ */.test(spaces_re[1])) {
    _o_.error(self._input, 'non-ascii 0x20 space for indentation');
  }

  if (spaces_re[3] !== '') {
    _o_.error(self._input, 'trailing space');
  }
};

/** @private */
_o_.LineParser.prototype._checkContinuation = function() {
  var self = this;
  var cont_re;
  cont_re = /^\s*\|/.exec(self._input.line);
  self._isContinuation = !!cont_re;
};

/** @private */
_o_.LineParser.prototype._checkSeparator = function() {
  var self = this;
  self._isSeparator = /^\s*--\s*$/.test(self._input.line);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.LineTransformer = function(context, input) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  // TODO: This field is not used -- only 's' is set and LineParser pre-parses
  //     for a separator.
  // '' for unknown (or statement).
  // 'p' for param line.
  // 's' for separator.
  // 't' for type.
  // 'm' for marker.
  /** @private {string} */
  this._grammar = ('');
};
_o_.LineTransformer.prototype._classname = '_o_.LineTransformer';
/** @type {string} */
_o_.LineTransformer.prototype.grammar;
_o_.LineTransformer.prototype.__defineGetter__('grammar', function() {
return this._grammar;
});
_o_.LineTransformer.prototype.__defineSetter__('grammar', function(value) {
this._grammar = value;
});

/** @type {string} */
_o_.LineTransformer.prototype.COMPILED_PKGS_BASE;
_o_.LineTransformer.prototype.__defineGetter__('COMPILED_PKGS_BASE', function() {
  var self = this;
  return (_o_.COMPILED_PKGS_BASE);
});

/** @return {string} */
_o_.LineTransformer.prototype.pkg = function() {
  var self = this;
  return (self._context.pkg.toString());
};

/** @return {string} */
_o_.LineTransformer.prototype.klass = function() {
  var self = this;
  if (!self._context.cls) {
    throw "Class name requested outside of class context.";
  }
  return (self._context.cls.name().ref);
};

/**
 * @param {!Array} type_name
 * @return {string}
 */
_o_.LineTransformer.prototype.cast = function(type_name) {
  var self = this;
  return ('/** @type {' + new _o_.type.Decoder(self._context.pkg, (
    new _o_.parser.TokenListBuilder(type_name, self).build().str
  )).output() + '} */');
};

/**
 * @param {!Array} type_name
 * @return {string}
 */
_o_.LineTransformer.prototype.type = function(type_name) {
  var self = this;
  return (new _o_.type.Decoder(self._context.pkg, (
    new _o_.parser.TokenListBuilder(type_name, self).build().str
  )).output());
};

/**
 * @param {!_o_.parser.TokenList} args
 * @return {!Array}
 */
_o_.LineTransformer.prototype.parentCall = function(args) {
  var self = this;
  var end;
  end = !args ? ')' : [', ', args, ')'];
  if (self._context.isCtor) {
    return ([self._context.cls.ctor.parentName() + '.call(this', end]);
  }
  else if (self._context.isMethod) {
    return ([[
      self._context.cls.ctor.parentName(),
      '.prototype.',
      self._context.name.id,
      '.call(this'
    ].join(''), end]);
  }
  else {
    _o_.error(self._input, 'parent call appeared in non-ctor / non-method.');
    return (['^(', args, ')']);
  }
};

/**
 * @param {string} type
 * @return {!_o_.parser.BlockMarker}
 */
_o_.LineTransformer.prototype.marker = function(type) {
  var self = this;
  return (new _o_.parser.BlockMarker(type));
};

/**
 * @param {string} name
 * @param {boolean} member
 * @param {string} access
 * @param {!Array} type
 * @param {string} marker
 * @param {!Array} init
 * @return {!_o_.parser.ParamLine}
 */
_o_.LineTransformer.prototype.paramLine = function(name, member, access, type, marker, init) {
  var self = this;
  return (new _o_.parser.ParamLine(
    name,
    member,
    access,
    new _o_.parser.TokenListBuilder(type, self).build().str,
    marker,
    new _o_.parser.TokenListBuilder(init, self).build()
  ));
};

/**
 * @param {!Array.<string>} ids
 * @param {!Array} type
 * @return {!_o_.parser.TmplAndTypeLine}
 */
_o_.LineTransformer.prototype.tmplAndTypeLine = function(ids, type) {
  var self = this;
  return (new _o_.parser.TmplAndTypeLine(
    ids,
    new _o_.parser.TokenListBuilder(type, self).build().str
  ));
};

/**
 * @param {!Array|!Object|string} line
 * @return {!Function}
 */
_o_.LineTransformer.prototype.prepend = function(line) {
  var self = this;
  return ((
  /** @param {!_o_.parser.TokenList} tokens */
  function(tokens) {
    tokens.prepend(new _o_.parser.TokenListBuilder(line, self).build());
    return ('');
  }));
};

/**
 * @param {!Array|!Object|string} line
 * @return {!Function}
 */
_o_.LineTransformer.prototype.append = function(line) {
  var self = this;
  return ((
  /** @param {!_o_.parser.TokenList} tokens */
  function(tokens) {
    tokens.append(new _o_.parser.TokenListBuilder(line, self).build());
    return ('');
  }));
};
/*
Pseudo member is a place holder for class members that don't exist, but there
are accessors for.
*/
/**
 * @param {string} name
 * @param {!_o_.type.Decoder|null} type
 * @param {string} accessType
 * @param {boolean} isPseudo
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.Member = function(name, type, accessType, isPseudo) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {!_o_.type.Decoder|null} */
  this._type = type;
  /** @private {string} */
  this._accessType = accessType;
  /** @private {boolean} */
  this._isPseudo = isPseudo;
  /** @private {boolean} */
  this._declared = (false);
};
_o_.Member.prototype._classname = '_o_.Member';

/*
returns an array with member declaration if it hasn't been output already.
returns an empty array otherwise.
*/
/**
 * @param {!_o_.context.Name} class_name
 * @return {!Array.<string>}
 */
_o_.Member.prototype.outputDecl = function(class_name) {
  var self = this;
  if (self._declared) {
    return ([]);
  }
  self._declared = true;
  // TODO: this member decl always allows setting a value to it even when only the
  // getter is provided.
  return ([
    '/** @type {' + self._type.output() + '}' + ' */',
    class_name.property(self._name).decl + ';'
  ]);
};

/*
output a getter or a setter.
*/
/**
 * @param {!_o_.context.Name} class_name
 * @param {boolean} is_getter
 * @param {!Array} body
 * @param {!_o_.ParamSet=} params
 * @return {!Array}
 */
_o_.Member.prototype.outputAccessor = function(class_name, is_getter, body, params) {
  var self = this;
  var p;
  p = self._isPseudo && params ? params.outputParams() : 'value';
  return ([is_getter ? (
    (
      (class_name.property('__defineGetter__').decl) +
      ("('" + self._name + "', function() {")
    )
  ) : (
    (
      (class_name.property('__defineSetter__').decl) +
      ("('" + self._name + "', function(" + p + ') {')
    )
  ), body, '});']);
};

/*
produce necessary accessor methods based on the access type specification.
*/
/**
 * @param {!_o_.context.Name} class_name
 * @return {!Array}
 */
_o_.Member.prototype.outputAccessors = function(class_name) {
  var self = this;
  if (!self._accessType || self._isPseudo) {
    return ([]);
  }
  var result;
  result = [self.outputDecl(class_name)];
  if ('+&'.indexOf(self._accessType) >= 0) {
    result.push(self.outputAccessor(class_name, true, ['return this._' + self._name + ';']));
  }
  if ('*&'.indexOf(self._accessType) >= 0) {
    result.push(self.outputAccessor(class_name, false, ['this._' + self._name + ' = value;']));
  }
  return (result);
};
/*
Function parameter and / or member declarion.
*/
/**
 * @param {!_o_.context.Context} context
 * @param {boolean} is_ctor
 * @param {!_o_.input.Line} inputs
 * @param {!_o_.parser.Result|null} parsed
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.Param = function(context, is_ctor, inputs, parsed) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;

  /** @private {!_o_.parser.ParamLine|null} */
  this._line = (null);
  /** @private {boolean} */
  this._success = (false);
  /** @private {!_o_.type.Decoder|null} */
  this._type = (null);
  /** @private {!Array.<!_o_.parser.BlockMarker|string>|null} */
  this._valueLine = (null);
  /** @private {number|null} */
  this._index = (null);

  if (!(parsed.tokens instanceof _o_.parser.ParamLine)) {
    return;
  }

  self._line = parsed.tokens;
  self._success = true;
  self._type = new _o_.type.Decoder(self._context.pkg, self._line.type);

  self._valueLine = self._line.init && !self._line.init.isEmpty ? self._line.init.list : null;
  if (self.isMember && self.initType !== '$' && !self._valueLine) {
    // member with no initializer or optional param init.
    self._valueLine = ['null'];
  }

  // sanity check the param consistency.
  if (!is_ctor && self.isMember) {
    _o_.error(inputs, 'member param for non-constructor method');
  }
  if (!self.isMember && self.initType !== '?' && self._valueLine) {
    _o_.error(inputs, 'initial value for non-member non-optional');
  }
};
_o_.Param.prototype._classname = '_o_.Param';
/** @type {boolean} */
_o_.Param.prototype.success;
_o_.Param.prototype.__defineGetter__('success', function() {
return this._success;
});
/** @type {!_o_.type.Decoder|null} */
_o_.Param.prototype.type;
_o_.Param.prototype.__defineGetter__('type', function() {
return this._type;
});
/** @type {!Array.<!_o_.parser.BlockMarker|string>|null} */
_o_.Param.prototype.valueLine;
_o_.Param.prototype.__defineGetter__('valueLine', function() {
return this._valueLine;
});
/** @type {number|null} */
_o_.Param.prototype.index;
_o_.Param.prototype.__defineGetter__('index', function() {
return this._index;
});
_o_.Param.prototype.__defineSetter__('index', function(value) {
this._index = value;
});

/** @type {boolean} */
_o_.Param.prototype.isMember;
_o_.Param.prototype.__defineGetter__('isMember', function() {
  var self = this;
  return (self._line.isMember);
});

/** @type {string} */
_o_.Param.prototype.name;
_o_.Param.prototype.__defineGetter__('name', function() {
  var self = this;
  return (self._line.name);
});

/** @type {string} */
_o_.Param.prototype.accessType;
_o_.Param.prototype.__defineGetter__('accessType', function() {
  var self = this;
  return (self._line.access);
});

/** @type {string} */
_o_.Param.prototype.initType;
_o_.Param.prototype.__defineGetter__('initType', function() {
  var self = this;
  return (self._line.marker);
});

/** @type {boolean} */
_o_.Param.prototype.hasInit;
_o_.Param.prototype.__defineGetter__('hasInit', function() {
  var self = this;
  return (!!self._valueLine);
});

/**
 * @return {string}
 * @private
 */
_o_.Param.prototype._paramName = function() {
  var self = this;
  return ((self.hasInit ? 'opt_' : '') + self.name);
};

/** @return {string} */
_o_.Param.prototype.outputDecl = function() {
  var self = this;
  if (!self._type || !self.initType) {
    return ('');
  }
  var typestr;
  typestr = self._type.output();
  if (self.initType === '?') {
    typestr += '=';
  }
  if (self.initType === ';') {
    typestr = '...' + typestr;
  }
  return ('@param {' + typestr + '} ' + self._paramName());
};

/** @return {string} */
_o_.Param.prototype.outputParam = function() {
  var self = this;
  return (self.initType === '' ? '' : self._paramName());
};

/*
Variable initialization output as first statements of function body.
*/
/** @param {!_o_.output.Line} out */
_o_.Param.prototype.outputInit = function(out) {
  var self = this;
  var pname;
  pname = self._paramName();

  if (!self.isMember && !self.hasInit && self.initType !== ';') {
    return;
  }

  if (self.isMember) {
    out.prefixLines = out.prefixLines.concat(_o_.docLines([
      '@private {' + self._type.output() + '}'
    ]));
  }

  out.linePrefix = (
    (self.isMember ? 'this._' : (self.initType === ';' ? '' : 'var ')) +
    (self.name) +
    (' = ')
  );
  switch (self.initType) {
    case '?':;
    case '$':;
    out.linePrefix += pname;
    if (self.hasInit) {
      out.linePrefix += ' === undefined ? (';
      out.lineSuffix = ') : ' + pname;
    }
    break;

    case ';':;
    out.linePrefix += 'Array.prototype.slice.call(arguments, ' + self.index + ')';
    break;

    default:;
    out.linePrefix += '(';
    out.lineSuffix = ')';
  }
};

/** @return {string} */
_o_.Param.prototype.outputArgType = function() {
  var self = this;
  var type;
  type = self._type.output();
  var re;
  re = /^\!?([a-zA-Z][\w\.]*)$/.exec(type);
  if (!re) {
    return ('null');
  }
  var type_name;
  type_name = re[1];
  return (ARG_TYPE_REPLACE_MAP[type_name] || type_name);
};

/** @return {string|null} */
_o_.Param.prototype.argtype = function() {
  var self = this;
  var type;
  type = self._type.output();
  var re;
  re = /^\!?([a-zA-Z_][\w\.]*)$/.exec(type);
  if (!re) {
    return (null);
  }
  var type_name;
  type_name = re[1];
  return (ARG_TYPE_REPLACE_MAP[type_name] || type_name);
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
 * @param {!_o_.context.Context} context
 * @param {!_o_.IndentBlock} block
 * @param {boolean=} opt_isCtor
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.ParamSet = function(context, block, opt_isCtor) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.IndentBlock} */
  this._block = block;
  /** @private {boolean} */
  this._isCtor = opt_isCtor === undefined ? (false) : opt_isCtor;
  /** @private {!Array.<!_o_.Param>} */
  this._params = ([]);
  /** @private {string} */
  this._returnType = ('');
  /** @private {!Array.<string>} */
  this._templateParams = ([]);
};
_o_.ParamSet.prototype._classname = '_o_.ParamSet';
/** @type {!Array.<string>} */
_o_.ParamSet.prototype.templateParams;
_o_.ParamSet.prototype.__defineGetter__('templateParams', function() {
return this._templateParams;
});
_o_.ParamSet.prototype.__defineSetter__('templateParams', function(value) {
this._templateParams = value;
});

_o_.ParamSet.prototype.transform = function() {
  var self = this;
  var param_done;
  param_done = false;
  self._block.eachLine(
  /**
   * @param {!_o_.SectionLine|null} line
   * @param {number} i
   */
  function(line, i) {
    if (param_done) {
      return;
    }
    if (line instanceof _o_.SeparatorLine) {
      param_done = true;
      return;
    }
    if (line instanceof _o_.CodeLine && !line.isContinuation) {
      var p;
      p = self._addLine(/** @type {!_o_.CodeLine} */(line), i);
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
 * @param {!_o_.CodeLine} line
 * @param {number} index
 * @return {!_o_.Param|boolean|null}
 * @private
 */
_o_.ParamSet.prototype._addLine = function(line, index) {
  var self = this;
  var p;
  p = new _o_.Param(self._context, self._isCtor, line.input, line.parsed);
  if (!p.success) {
    if (index !== 0 || self._context.isFileScope) {
      return (null);
    }
    // could be the return type.
    return (self._tryReturnType(line));
  }

  p.index = self._params.length;
  self._params.push(p);
  if (p.isMember) {
    self._context.cls.addMember(p.name, p.type, p.accessType);
  }
  return (p);
};

/**
 * @param {!_o_.CodeLine} line
 * @return {boolean}
 * @private
 */
_o_.ParamSet.prototype._tryReturnType = function(line) {
  var self = this;
  var tokens;
  tokens = line.parsed.tokens;
  if (tokens.list.length !== 1) {
    return (false);
  }
  var token;
  token = tokens.list[0];
  if (!(token instanceof _o_.parser.TmplAndTypeLine)) {
    return (false);
  }
  self._returnType = token.type;
  self._templateParams = token.ids;
  return (true);
};

/** @param {string} return_type */
_o_.ParamSet.prototype.setReturnType = function(return_type) {
  var self = this;
  if (return_type) {
    self._returnType = new _o_.type.Decoder(self._context.pkg, return_type).output();
  }
};

/** @return {boolean} */
_o_.ParamSet.prototype.isEmpty = function() {
  var self = this;
  return (self._params.length === 0);
};

/** @type {number} */
_o_.ParamSet.prototype.numParams;
_o_.ParamSet.prototype.__defineGetter__('numParams', function() {
  var self = this;
  return (self._params.length);
});

/**
 * @param {number} i
 * @return {!_o_.type.Decoder|null}
 */
_o_.ParamSet.prototype.paramType = function(i) {
  var self = this;
  return (self._params[i].type);
};

/** @return {boolean} */
_o_.ParamSet.prototype.isInitEmpty = function() {
  var self = this;
  return (!self._params.some(
  /** @param {!_o_.Param} p */
  function(p) {
    return (p.isMember || p.initType === '?');
  }));
};

/** @return {boolean} */
_o_.ParamSet.prototype.isDeclEmpty = function() {
  var self = this;
  return (!self._returnType && !self._params.some(
  /** @param {!_o_.Param} p */
  function(p) {
    return (!!p.type);
  }));
};

/** @return {!Array.<string>} */
_o_.ParamSet.prototype.outputDecls = function() {
  var self = this;
  var result;
  result = self._params.map(
  /** @param {!_o_.Param} p */
  function(p) {
    return (p.outputDecl());
  }).filter(
  /** @param {string} s */
  function(s) {
    return (!!s);
  });
  if (self._returnType) {
    result.push('@return {' + self._returnType + '}');
  }
  if (self._templateParams && self._templateParams.length) {
    result.push('@template ' + self._templateParams.join(','));
  }
  return (result);
};

/** @return {string} */
_o_.ParamSet.prototype.outputParams = function() {
  var self = this;
  // function parameter output.
  return (self._params.map(
  /** @param {!_o_.Param} p */
  function(p) {
    return (p.outputParam());
  }).filter(
  /** @param {string} s */
  function(s) {
    return (!!s);
  }).join(', '));
};

/** @return {string} */
_o_.ParamSet.prototype.outputArgTypes = function() {
  var self = this;
  return ('[' + self._params.map(
  /** @param {!_o_.Param} p */
  function(p) {
    return (p.outputArgType());
  }).join(', ') + ']');
};

/** @param {!_o_.type.Callable|null} types */
_o_.ParamSet.prototype.setArgTypes = function(types) {
  var self = this;
  self._params.forEach(
  /** @param {!_o_.Param} p */
  function(p) {
    types.addArg(p.argtype());
  });
};
/**
 * @param {!_o_.input.Line} input
 * @param {!_o_.LineParser} p
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.SeparatorLine = function(input, p) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {number} */
  this._indent = (p.indent);
};
_o_.SeparatorLine.prototype._classname = '_o_.SeparatorLine';
/** @type {!_o_.input.Line} */
_o_.SeparatorLine.prototype.input;
_o_.SeparatorLine.prototype.__defineGetter__('input', function() {
return this._input;
});
/** @type {number} */
_o_.SeparatorLine.prototype.indent;
_o_.SeparatorLine.prototype.__defineGetter__('indent', function() {
return this._indent;
});

/** @type {boolean} */
_o_.SeparatorLine.prototype.isContinuation;
_o_.SeparatorLine.prototype.__defineGetter__('isContinuation', function() {
  var self = this;
  return (false);
});

/** @return {!_o_.output.Line|null} */
_o_.SeparatorLine.prototype.output = function() {
  var self = this;
  return (null);
};
/**
 * @param {string} name
 * @param {string} packageName
 * @param {!Array.<string>} input
 * @param {!Array.<string>} output
 * @param {boolean} isGlobal
 * @param {boolean} expectError
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.TestCase = function(name, packageName, input, output, isGlobal, expectError) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {string} */
  this._packageName = packageName;
  /** @private {!Array.<string>} */
  this._input = input;
  /** @private {!Array.<string>} */
  this._output = output;
  /** @private {boolean} */
  this._isGlobal = isGlobal;
  /** @private {boolean} */
  this._expectError = expectError;
  /** @private {boolean} */
  this._failed = (false);
};
_o_.TestCase.prototype._classname = '_o_.TestCase';
/** @type {boolean} */
_o_.TestCase.prototype.failed;
_o_.TestCase.prototype.__defineGetter__('failed', function() {
return this._failed;
});

_o_.TestCase.prototype.run = function() {
  var self = this;
  var c;
  c = self._isGlobal ? (
    new _o_.FileScope(self._name, self._packageName, 'FileName')
  ) : (
    new _o_.CodeScope(new _o_.context.Context(self._name, new _o_.context.Package('')))
  );

  var actual_output;
  actual_output = '';
  _o_.TestCase.OUTPUT_ERROR = !self._expectError;
  try {
    c.processLines(self._input);
    actual_output = c.output();
    if (self._isGlobal) {
      var type_str;
      type_str = JSON.stringify(c.types.extract(), undefined, 2);
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
 * @param {!Array.<string>} content
 * @private
 */
_o_.TestCase.prototype._warnWithIndent = function(title, content) {
  var self = this;
  console.log('  ' + title + ':');
  var warn_rec;
  warn_rec = 
  /**
   * @param {string|!Array} lines
   * @param {number} level
   */
  function(lines, level) {
    if (typeof(lines) === 'string') {
      console.log(_o_.whitespaces(4 + level * 2) + lines);
    }
    else {
      if (lines instanceof _o_.output.Line) {
        lines = lines.output;
      }
      lines.forEach(
      /** @param {string|!Array} line */
      function(line) {
        warn_rec(line, level + 1);
      });
    }
  };
  warn_rec(content, 0);
};

/**
 * @param {!Array.<string>} lines0
 * @param {!Array.<string>} lines1
 * @private
 */
_o_.TestCase.prototype._makeDiff = function(lines0, lines1) {
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
  return (result);
};

  exports.TestCase = _o_.TestCase;
_o_.transformToJs = /**
 * @param {string} base_dir
 * @param {string} in_file
 * @param {string} out_file
 */
function(base_dir, in_file, out_file) {
  var pkg_name;
  pkg_name = _o_.relativeFileName(
    base_dir,
    in_file.replace(/[\/\\][^\/\\]*$/, '')
  ).replace(/[\/\\]/, '.');
  var file_name;
  file_name = in_file.replace(/.*[\/\\]/, '').replace(/\..*$/, '');

  var c;
  c = new _o_.FileScope(in_file, pkg_name, file_name);
  c.processLines(_fs.readFileSync(in_file, 'utf-8').split('\n'));
  _o_.writeFile(out_file, c.output().join('\n'));
  _o_.writeFile(
    out_file.replace(/\.js$/, '.tk'),
    JSON.stringify(c.types.extract())
  );
};

_o_.relativeFileName = /**
 * @param {string} base_dir
 * @param {string} file_name
 */
function(base_dir, file_name) {
  if (base_dir && file_name.indexOf(base_dir) === 0) {
    // strip off the base_dir.
    return (file_name.substr(base_dir.length).replace(/^[\/\\]*/, ''));
  }
  return (file_name);
};

_o_.outputFileName = /**
 * @param {string} base_dir
 * @param {string} in_file
 * @param {string} out_dir
 */
function(base_dir, in_file, out_dir) {
  return (out_dir + '/' + _o_.relativeFileName(base_dir, (
    in_file.replace(/\.ir$/, '.js')
  )));
};

_o_.needCompile = /**
 * @param {string} src
 * @param {string} dst
 */
function(src, dst) {
  if (!_fs.existsSync(dst)) {
    return (true);
  }
  var src_stat;
  src_stat = _fs.statSync(src);
  var dst_stat;
  dst_stat = _fs.statSync(dst);
  return (src_stat.mtime.getTime() > dst_stat.mtime.getTime());
};

  exports.compileFiles = 
  /**
   * @param {string} base_dir
   * @param {!Array.<string>} in_files
   * @param {string} out_dir
   * @param {boolean=} opt_silent
   */
  function(base_dir, in_files, out_dir, opt_silent) {
    var silent = opt_silent === undefined ? (false) : opt_silent;
    in_files.forEach(
    /** @param {string} in_file */
    function(in_file) {

      var out_file;
      out_file = _o_.outputFileName(base_dir, in_file, out_dir);
      var logstr;
      logstr = '[' + in_file + ' => ' + out_file + '] ';

      if (!_fs.existsSync(in_file)) {
        console.error(logstr + 'input not found');
        return;
      }

      if (!_o_.needCompile(in_file, out_file)) {
        if (!silent) {
          console.log(logstr + 'skipping');
        }
        return;
      }

      if (!silent) {
        console.log(logstr + 'compiling');
      }
      _o_.transformToJs(base_dir, in_file, out_file);
    });
  };
/*
Write data into the specified file. Create the file or its directory If they do
not exit.
*/
_o_.writeFile = /**
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
_o_.OUTPUT_ERROR = true;

_o_.error = /**
 * @param {!_o_.input.Line} line
 * @param {string=} opt_msg
 * @param {!Array.<string>=} additional_lines
 */
function(line, opt_msg, additional_lines) {
  var msg = opt_msg === undefined ? ('*warning*') : opt_msg;
  if (_o_.OUTPUT_ERROR) {
    console.error(line.file + ':' + line.lineNo + ': ERROR - ' + msg);
  }
  if (additional_lines) {
    additional_lines.forEach(
    /** @param {string} additional_line */
    function(additional_line) {
      if (_o_.OUTPUT_ERROR) {
        console.error(additional_line);
      }
    });
  }
  else {
    if (_o_.OUTPUT_ERROR) {
      console.error(line.line);
    }
  }
  if (_o_.OUTPUT_ERROR) {
    console.trace();
  }
  throw "Compile Error";
};

_o_.assert = /**
 * @param {*} check
 * @param {!_o_.input.Line=} opt_line
 * @param {string=} opt_msg
 */
function(check, opt_line, opt_msg) {
  var line = opt_line === undefined ? (_o_.input.UnknownInputLine) : opt_line;
  var msg = opt_msg === undefined ? ('*assertion*') : opt_msg;
  console.assert(
    check,
    msg + (line ? ' (line ' + line.lineNo + '): ' + line.line : '')
  );
};

_o_.l = /**
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
   * @param {!Array.<string>} files
   * @return {!Array.<string>}
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

    return (['var _o_ = {};'].concat(Object.keys(pkgs).sort().map(
    /** @param {string} pkg */
    function(pkg) {
      return (_o_.COMPILED_PKGS_BASE + pkg + ' = {};');
    })));
  };
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.StringSet = function() {
  var self = this;
  /** @private {!Array.<string>} */
  this._list = ([]);
  /** @private {!Object.<string,boolean>} */
  this._map = ({});
};
_o_.StringSet.prototype._classname = '_o_.StringSet';

/** @return {string} */
_o_.StringSet.prototype.toString = function() {
  var self = this;
  return (self._list.join('|'));
};

/** @return {!Array.<string>} */
_o_.StringSet.prototype.list = function() {
  var self = this;
  return (self._list);
};

/** @return {number} */
_o_.StringSet.prototype.size = function() {
  var self = this;
  return (self._list.length);
};

/**
 * @param {string} str
 * @return {boolean}
 */
_o_.StringSet.prototype.has = function(str) {
  var self = this;
  return (self._map[str]);
};

/** @param {!Array.<string>} strs */
_o_.StringSet.prototype.addAll = function(strs) {
  var self = this;
  strs.forEach(
  /** @param {string} str */
  function(str) {
    self.add(str);
  });
};

/** @param {string} str */
_o_.StringSet.prototype.add = function(str) {
  var self = this;
  self._list.push(str);
  self._map[str] = true;
};

/**
 * @param {!Array.<string>} strs
 * @return {!Array.<string>}
 */
_o_.StringSet.prototype.filterOut = function(strs) {
  var self = this;
  // remove the strings that are in this set.
  return (strs.filter(
  /** @param {string} f */
  function(f) {
    return (!self._map[f]);
  }));
};


/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.ClassDeps = function() {
  var self = this;
  // Maps class name to file name where its defined.
  /** @private {!Object.<string,string>} */
  this._where = ({});
  // Maps file name to array of required class names.
  /** @private {!Object.<string,!Array.<string>>} */
  this._depends = ({});
};
_o_.ClassDeps.prototype._classname = '_o_.ClassDeps';

/** @return {string} */
_o_.ClassDeps.prototype.toString = function() {
  var self = this;
  return (Object.keys(/** @type {!Object} */(self._depends)).map(
  /** @param {string} k */
  function(k) {
    var list;
    list = self._depends[k];
    return (list.length ? '[' + k + ':' + list.join('|') + ']' : '');
  }).join(''));
};

/** @param {!Array.<string>} files */
_o_.ClassDeps.prototype.load = function(files) {
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
      return (self._where[dep] !== file);
    });
  });
};

/**
 * @param {string} file
 * @return {boolean}
 */
_o_.ClassDeps.prototype.hasDeps = function(file) {
  var self = this;
  var dep;
  dep = self._depends[file];
  return (!!dep && !!dep.length);
};

/**
 * @param {string} file
 * @param {!_o_.StringSet} provided_files
 */
_o_.ClassDeps.prototype.removeDeps = function(file, provided_files) {
  var self = this;
  self._depends[file] = self._depends[file].filter(
  /**
   * @param {string} dep
   * @param {number} i
   */
  function(dep, i) {
    return (!provided_files.has(self._where[dep]));
  });
};


  exports.createSortedList = 
  /**
   * @param {!Array.<string>} files
   * @return {!Array.<string>}
   */
  function(files) {
    var deps;
    deps = new _o_.ClassDeps();
    deps.load(files);

    // sort the files in inheritance order.
    var all;
    all = files.concat();
    var sorted;
    sorted = new _o_.StringSet();
    while (all.length) {
      var found;
      found = new _o_.StringSet();
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
    return (sorted.list());
  };
_o_.arrFlatten = /** @param {string|!Array} lines */
function(lines) {
  if (typeof(lines) === 'string') {
    return ([lines]);
  }
  if (lines instanceof _o_.output.Line || lines instanceof _o_.output.Block) {
    lines = lines.output;
  }
  console.assert(
    lines instanceof Array,
    'input to arrFlatten should be a string or an array'
  );
  return (lines.reduce(
  /**
   * @param {!Array} arr
   * @param {string|!Array} line
   */
  function(arr, line) {
    return (arr.concat(_o_.arrFlatten(line)));
  }, []));
};

_o_.check = /** @param {!Object} obj */
function(obj) {
  console.log(_util.inspect(obj, false, null));
};

_o_.whitespaces = /**
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
  return (s);
};

_o_.objStringify = /**
 * @param {!Object} obj
 * @param {boolean=} compact
 * @param {string=} name
 * @param {number=} opt_level
 * @return {string}
 */
function(obj, compact, name, opt_level) {
  var level = opt_level === undefined ? (0) : opt_level;
  var start_str;
  start_str = _o_.whitespaces(level * 2);
  if (name) {
    start_str += name + ':';
  }

  if (obj instanceof Array) {
    var children;
    children = obj.map(
    /** @param {!Object} c */
    function(c) {
      return (_o_.objStringify(c, compact, undefined, level + 1));
    }).filter(
    /** @param {string} c */
    function(c) {
      return (!!c);
    });
    if (children.length) {
      return (start_str + '[\n' + children.join('') + _o_.whitespaces(level * 2) + ']\n');
    }
    else {
      return (compact ? '' : start_str + '[]\n');
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
      return (_o_.objStringify(obj[k], compact, k, level + 1));
    }).filter(
    /** @param {string} c */
    function(c) {
      return (!!c);
    });
    if (children.length) {
      return (start_str + '{\n' + children.join('') + _o_.whitespaces(level * 2) + '}\n');
    }
    else {
      return (compact ? '' : start_str + '{}\n');
    }
  }
  else {
    return (start_str + obj + '\n');
  }
};

_o_.docLines = /**
 * @param {!Array.<string>} annotations
 * @return {!Array.<string>}
 */
function(annotations) {
  var alist;
  alist = _o_.arrFlatten(annotations);
  if (alist.length === 0) {
    return ([]);
  }
  if (alist.length === 1) {
    return (['/** ' + alist[0] + ' */']);
  }
  return (_o_.arrFlatten([
    '/**',
    alist.map(
    /** @param {string} annotation */
    function(annotation) {
      return (' * ' + annotation);
    }),
    ' */'
  ]));
};
/**
 * @param {boolean=} opt_isInterface
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.context.Class = function(opt_isInterface) {
  var self = this;
  /** @private {boolean} */
  this._isInterface = opt_isInterface === undefined ? (false) : opt_isInterface;
  /** @private {!_o_.section.Constructor|!_o_.section.Interface|null} */
  this._ctor = (null);
  /** @private {!Object.<string,!_o_.Member>} */
  this._members = ({});
};
_o_.context.Class.prototype._classname = '_o_.context.Class';
/** @type {boolean} */
_o_.context.Class.prototype.isInterface;
_o_.context.Class.prototype.__defineGetter__('isInterface', function() {
return this._isInterface;
});
_o_.context.Class.prototype.__defineSetter__('isInterface', function(value) {
this._isInterface = value;
});
/** @type {!_o_.section.Constructor|!_o_.section.Interface|null} */
_o_.context.Class.prototype.ctor;
_o_.context.Class.prototype.__defineGetter__('ctor', function() {
return this._ctor;
});
_o_.context.Class.prototype.__defineSetter__('ctor', function(value) {
this._ctor = value;
});

/** @return {!_o_.context.Name} */
_o_.context.Class.prototype.name = function() {
  var self = this;
  return (self._ctor.context.name);
};

/** @param {string} name */
_o_.context.Class.prototype.member = function(name) {
  var self = this;
  return (self._members[name]);
};

/**
 * @param {string} name
 * @param {!_o_.Member} member
 */
_o_.context.Class.prototype.setMember = function(name, member) {
  var self = this;
  self._members[name] = member;
};

/**
 * @param {string} method_name
 * @return {!_o_.context.Name}
 */
_o_.context.Class.prototype.methodName = function(method_name) {
  var self = this;
  return (self.name().property(method_name));
};

/**
 * @param {string} property_name
 * @return {!_o_.context.Name}
 */
_o_.context.Class.prototype.staticName = function(property_name) {
  var self = this;
  return (self.name().staticProperty(property_name));
};

/**
 * @param {string} name
 * @param {!_o_.type.Decoder|null} type
 * @param {string} access_type
 * @param {boolean=} opt_is_pseudo
 * @return {!_o_.Member}
 */
_o_.context.Class.prototype.addMember = function(name, type, access_type, opt_is_pseudo) {
  var self = this;
  var is_pseudo = opt_is_pseudo === undefined ? (false) : opt_is_pseudo;
  var m;
  m = new _o_.Member(name, type, access_type, is_pseudo);
  self._members[name] = m;
  return (m);
};

/** @return {!Array} */
_o_.context.Class.prototype.outputAccessors = function() {
  var self = this;
  var class_name;
  class_name = self.name();
  return (Object.keys(self._members).map(
  /** @param {string} name */
  function(name) {
    return (self._members[name].outputAccessors(class_name));
  }));
};
/**
 * @param {string} fileName
 * @param {!_o_.context.Package} pkg
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.context.Context = function(fileName, pkg) {
  var self = this;
  /** @private {string} */
  this._fileName = fileName;
  /** @private {!_o_.context.Package} */
  this._pkg = pkg;
  /** @private {!_o_.context.Name} */
  this._name = (new _o_.context.Name(self._pkg, ''));
  /** @private {!_o_.context.Class|null} */
  this._cls = (null);
  /** @private {boolean} */
  this._isCtor = (false);
  /** @private {boolean} */
  this._isMethod = (false);
  /** @private {boolean} */
  this._isFileScope = (false);
};
_o_.context.Context.prototype._classname = '_o_.context.Context';
/** @type {string} */
_o_.context.Context.prototype.fileName;
_o_.context.Context.prototype.__defineGetter__('fileName', function() {
return this._fileName;
});
/** @type {!_o_.context.Package} */
_o_.context.Context.prototype.pkg;
_o_.context.Context.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
_o_.context.Context.prototype.__defineSetter__('pkg', function(value) {
this._pkg = value;
});
/** @type {!_o_.context.Name} */
_o_.context.Context.prototype.name;
_o_.context.Context.prototype.__defineGetter__('name', function() {
return this._name;
});
_o_.context.Context.prototype.__defineSetter__('name', function(value) {
this._name = value;
});
/** @type {!_o_.context.Class|null} */
_o_.context.Context.prototype.cls;
_o_.context.Context.prototype.__defineGetter__('cls', function() {
return this._cls;
});
_o_.context.Context.prototype.__defineSetter__('cls', function(value) {
this._cls = value;
});
/** @type {boolean} */
_o_.context.Context.prototype.isCtor;
_o_.context.Context.prototype.__defineGetter__('isCtor', function() {
return this._isCtor;
});
_o_.context.Context.prototype.__defineSetter__('isCtor', function(value) {
this._isCtor = value;
});
/** @type {boolean} */
_o_.context.Context.prototype.isMethod;
_o_.context.Context.prototype.__defineGetter__('isMethod', function() {
return this._isMethod;
});
_o_.context.Context.prototype.__defineSetter__('isMethod', function(value) {
this._isMethod = value;
});
/** @type {boolean} */
_o_.context.Context.prototype.isFileScope;
_o_.context.Context.prototype.__defineGetter__('isFileScope', function() {
return this._isFileScope;
});
_o_.context.Context.prototype.__defineSetter__('isFileScope', function(value) {
this._isFileScope = value;
});

/**
 * @param {number} scopeLevel
 * @return {!_o_.context.Name}
 */
_o_.context.Context.prototype.scopedName = function(scopeLevel) {
  var self = this;
  // 0: class, 1: package, 2: global.
  switch (scopeLevel) {
    case 0:;
    return (self._cls.staticName(self._name.id));

    case 1:;
    return (self._name);

    default:;
    return (self._name.global());
  }
};

/** @return {!_o_.context.Context} */
_o_.context.Context.prototype.clone = function() {
  var self = this;
  var c;
  c = new _o_.context.Context(self._fileName, self._pkg);
  c.name = self._name;
  c.cls = self._cls;
  c.isCtor = self._isCtor;
  c.isMethod = self._isMethod;
  c.isFileScope = self._isFileScope;
  return (c);
};
/*
Name in file scope.
*/
/**
 * @param {!_o_.context.Package} pkg
 * @param {string} id
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.context.Name = function(pkg, id) {
  var self = this;
  /** @private {!_o_.context.Package} */
  this._pkg = pkg;
  /** @private {string} */
  this._id = id;
};
_o_.context.Name.prototype._classname = '_o_.context.Name';
/** @type {!_o_.context.Package} */
_o_.context.Name.prototype.pkg;
_o_.context.Name.prototype.__defineGetter__('pkg', function() {
return this._pkg;
});
/** @type {string} */
_o_.context.Name.prototype.id;
_o_.context.Name.prototype.__defineGetter__('id', function() {
return this._id;
});

/** @type {string} */
_o_.context.Name.prototype.decl;
_o_.context.Name.prototype.__defineGetter__('decl', function() {
  var self = this;
  return (self._pkg.fullname(self._id));
});

/** @type {string} */
_o_.context.Name.prototype.ref;
_o_.context.Name.prototype.__defineGetter__('ref', function() {
  var self = this;
  return (self._pkg.fullname(self._id));
});

/** @return {!_o_.context.Name} */
_o_.context.Name.prototype.global = function() {
  var self = this;
  return (new _o_.context.Name(new _o_.context.Package(_o_.COMPILED_PKGS_BASE), self._id));
};

/**
 * @param {string} id
 * @return {!_o_.context.Name}
 */
_o_.context.Name.prototype.property = function(id) {
  var self = this;
  return (new _o_.context.Name(new _o_.context.Package(self.ref + '.prototype'), id));
};

/**
 * @param {string} id
 * @return {!_o_.context.Name}
 */
_o_.context.Name.prototype.staticProperty = function(id) {
  var self = this;
  return (new _o_.context.Name(new _o_.context.Package(self.ref), id));
};

/** @return {string} */
_o_.context.Name.prototype.toString = function() {
  var self = this;
  return ('[' + self._pkg + ':' + self._id + ']');
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
_o_.context.Package = function(pkg) {
  var self = this;
  /** @private {string} */
  this._pkg = pkg;
};
_o_.context.Package.prototype._classname = '_o_.context.Package';

/** @return {boolean} */
_o_.context.Package.prototype.empty = function() {
  var self = this;
  return (!self._pkg);
};

/**
 * @param {string} id
 * @return {string}
 */
_o_.context.Package.prototype.fullname = function(id) {
  var self = this;
  return (self._pkg + (self._pkg.slice(-1) === '.' ? '' : '.') + id);
};

/**
 * @param {string} str
 * @return {string}
 */
_o_.context.Package.prototype.replace = function(str) {
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
  return (str.replace(/^\%(\:\:|\.)/, 
  /**
   * @param {!Array.<string>} _
   * @param {string} connector
   */
  function(_, connector) {
    return (pkg ? pkg + connector : '');
  }));
};

/**
 * @param {string} str
 * @return {string}
 */
_o_.context.Package.prototype.replaceStr = function(str) {
  var self = this;
  return (str.replace(/\%+(\:\:|\.)/g, 
  /** @param {string} ref */
  function(ref) {
    return (self.replace(ref));
  }));
};

/** @return {string} */
_o_.context.Package.prototype.toString = function() {
  var self = this;
  return (self._pkg);
};
/*
Comment section in a file.
*/
/**
 * @param {!Array.<!_o_.input.Line>} lines
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.input.Comment = function(lines) {
  var self = this;
  /** @private {!Array.<!_o_.input.Line>} */
  this._lines = lines;
};
_o_.input.Comment.prototype._classname = '_o_.input.Comment';

_o_.input.Comment.prototype.output = function() {
  var self = this;
  var result;
  result = [];
  var buffer;
  buffer = [];
  var state;
  state = 's';
  self._lines.forEach(
  /** @param {!_o_.input.Line} line */
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

  return (result);
};
/*
Parses input lines into comments and sections.
'line' is used only during processing.
*/
/**
 * @param {string} name
 * @param {!Array.<string>} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.input.File = function(name, input) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {!Array.<string>} */
  this._input = input;
  /** @private {!Array.<!_o_.input.Comment|!_o_.input.Section>} */
  this._result = ([]);
  /** @private {!Array.<!_o_.input.Line>} */
  this._buffer = ([]);
  /** @private {number|null} */
  this._lastValidIndex = (null);
};
_o_.input.File.prototype._classname = '_o_.input.File';

/** @return {!Array.<!_o_.input.Comment|!_o_.input.Section>} */
_o_.input.File.prototype.parse = function() {
  var self = this;
  self._input.forEach(
  /**
   * @param {string} line
   * @param {number} index
   */
  function(line, index) {
    line = line.trimRight();
    self._processLine(new _o_.input.Line(self._name, line, index));
  });
  self._flushBuffer();
  return (self._result);
};

/**
 * @param {!_o_.input.Line} line
 * @private
 */
_o_.input.File.prototype._processLine = function(line) {
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
_o_.input.File.prototype._flushBuffer = function() {
  var self = this;
  while (self._buffer.length) {
    var next_buffer;
    next_buffer = [];
    if (self._lastValidIndex !== null) {
      var section;
      section = new _o_.input.Section(self._buffer[0]);
      self._result.push(section);
      self._buffer.forEach(
      /**
       * @param {!_o_.input.Line} line
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
      self._result.push(new _o_.input.Comment(self._buffer));
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
_o_.input.Line = function(file, line, rowIndex) {
  var self = this;
  /** @private {string} */
  this._file = file;
  /** @private {string} */
  this._line = line;
  /** @private {number} */
  this._rowIndex = rowIndex;
};
_o_.input.Line.prototype._classname = '_o_.input.Line';
/** @type {string} */
_o_.input.Line.prototype.file;
_o_.input.Line.prototype.__defineGetter__('file', function() {
return this._file;
});
/** @type {string} */
_o_.input.Line.prototype.line;
_o_.input.Line.prototype.__defineGetter__('line', function() {
return this._line;
});
/** @type {number} */
_o_.input.Line.prototype.rowIndex;
_o_.input.Line.prototype.__defineGetter__('rowIndex', function() {
return this._rowIndex;
});

/** @type {number} */
_o_.input.Line.prototype.lineNo;
_o_.input.Line.prototype.__defineGetter__('lineNo', function() {
  var self = this;
  return (self._rowIndex + 1);
});

/*
the line contents with indentation stripped off.
trailing whitespace should have been stripped already.
*/
/** @type {string} */
_o_.input.Line.prototype.trim;
_o_.input.Line.prototype.__defineGetter__('trim', function() {
  var self = this;
  var re;
  re = /\S.*/.exec(self._line);
  return (re ? re[0] : '');
});

/** @type {boolean} */
_o_.input.Line.prototype.startsWithColon;
_o_.input.Line.prototype.__defineGetter__('startsWithColon', function() {
  var self = this;
  return (self._line.substr(0, 1) === ':');
});

/** @type {boolean} */
_o_.input.Line.prototype.isBlank;
_o_.input.Line.prototype.__defineGetter__('isBlank', function() {
  var self = this;
  return (/^\s*$/.test(self._line));
});

/** @type {boolean} */
_o_.input.Line.prototype.isIndented;
_o_.input.Line.prototype.__defineGetter__('isIndented', function() {
  var self = this;
  return (/^\s/.test(self._line));
});

/** @type {number} */
_o_.input.Line.prototype.indent;
_o_.input.Line.prototype.__defineGetter__('indent', function() {
  var self = this;
  var re;
  re = /\S/.exec(self._line);
  return (re ? re.index : 0);
});

_o_.input.UnknownInputLine = new _o_.input.Line('(unknown)', '', -1);
/*
Input code section.
*/
/**
 * @param {!_o_.input.Line} header
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.input.Section = function(header) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._header = header;
  /** @private {!Array.<!_o_.input.Line>} */
  this._lines = ([]);
  /** @private {!_o_.section.Code|null} */
  this._code = (null);
};
_o_.input.Section.prototype._classname = '_o_.input.Section';
/** @type {!_o_.input.Line} */
_o_.input.Section.prototype.header;
_o_.input.Section.prototype.__defineGetter__('header', function() {
return this._header;
});
/** @type {!Array.<!_o_.input.Line>} */
_o_.input.Section.prototype.lines;
_o_.input.Section.prototype.__defineGetter__('lines', function() {
return this._lines;
});
/** @type {!_o_.section.Code|null} */
_o_.input.Section.prototype.code;
_o_.input.Section.prototype.__defineGetter__('code', function() {
return this._code;
});
_o_.input.Section.prototype.__defineSetter__('code', function(value) {
this._code = value;
});

/** @param {!_o_.input.Line} line */
_o_.input.Section.prototype.push = function(line) {
  var self = this;
  self._lines.push(line);
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.output.Block = function() {
  var self = this;
  /** @private {!Array.<!_o_.output.Line>} */
  this._lines = ([]);
  // the suffix, if assigned a value, will be inserted after the last nonblank line.
  /** @private {string|null} */
  this._suffix = (null);
};
_o_.output.Block.prototype._classname = '_o_.output.Block';
/** @type {string|null} */
_o_.output.Block.prototype.suffix;
_o_.output.Block.prototype.__defineGetter__('suffix', function() {
return this._suffix;
});
_o_.output.Block.prototype.__defineSetter__('suffix', function(value) {
this._suffix = value;
});

/** @param {!_o_.output.Line} line */
_o_.output.Block.prototype.appendLine = function(line) {
  var self = this;
  self._lines.push(line);
};

/** @type {boolean} */
_o_.output.Block.prototype.isEmpty;
_o_.output.Block.prototype.__defineGetter__('isEmpty', function() {
  var self = this;
  return (!self._lines.length && !self._suffix);
});

/*
inserts the suffix line to the array passed as a parameter.
*/
/**
 * @param {!Array.<string>} lines
 * @private
 */
_o_.output.Block.prototype._addSuffix = function(lines) {
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

/** @type {!Array.<string>} */
_o_.output.Block.prototype.output;
_o_.output.Block.prototype.__defineGetter__('output', function() {
  var self = this;
  var lines;
  lines = self._lines.reduce(
  /**
   * @param {!Array.<string>} prev
   * @param {!_o_.output.Line} line
   * @param {number} i
   */
  function(prev, line, i) {
    return (prev.concat(line.output));
  }, []);
  if (self._suffix) {
    self._addSuffix(lines);
  }
  return (lines);
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
_o_.output.IndentedMultiline = function(num_indent) {
  var self = this;
  /** @private {string} */
  this._indent = (_o_.whitespaces(num_indent));
  /** @private {!Array.<string>} */
  this._lines = ([]);
  /** @private {boolean} */
  this._lastLineOpen = (false);
};
_o_.output.IndentedMultiline.prototype._classname = '_o_.output.IndentedMultiline';

/** @type {!Array.<string>} */
_o_.output.IndentedMultiline.prototype.output;
_o_.output.IndentedMultiline.prototype.__defineGetter__('output', function() {
  var self = this;
  return (self._lines);
});

/**
 * @param {string} line
 * @param {boolean=} opt_end_line
 * @param {boolean=} opt_insert_blank
 */
_o_.output.IndentedMultiline.prototype.appendLine = function(line, opt_end_line, opt_insert_blank) {
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
_o_.output.IndentedMultiline.prototype.appendAll = function(lines) {
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
_o_.output.IndentedMultiline.prototype.appendBlock = function(block) {
  var self = this;
  self._lines = self._lines.concat(block);
  self._lastLineOpen = false;
};
/*
Output lines corresponds to one input line.
*/
/**
 * @param {!_o_.input.Line} input
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.output.Line = function(input) {
  var self = this;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {number} */
  this._indent = (input.indent);
  /** @private {!Array.<string>} */
  this._prefixLines = ([]);
  /** @private {!_o_.output.Multiline} */
  this._lines = (new _o_.output.Multiline());
  /** @private {string} */
  this._linePrefix = ('');
  /** @private {string} */
  this._lineSuffix = ('');
  /** @private {!Array.<string>} */
  this._tailComment = ([]);
};
_o_.output.Line.prototype._classname = '_o_.output.Line';
/** @type {number} */
_o_.output.Line.prototype.indent;
_o_.output.Line.prototype.__defineGetter__('indent', function() {
return this._indent;
});
_o_.output.Line.prototype.__defineSetter__('indent', function(value) {
this._indent = value;
});
/** @type {!Array.<string>} */
_o_.output.Line.prototype.prefixLines;
_o_.output.Line.prototype.__defineGetter__('prefixLines', function() {
return this._prefixLines;
});
_o_.output.Line.prototype.__defineSetter__('prefixLines', function(value) {
this._prefixLines = value;
});
/** @type {!_o_.output.Multiline} */
_o_.output.Line.prototype.lines;
_o_.output.Line.prototype.__defineGetter__('lines', function() {
return this._lines;
});
/** @type {string} */
_o_.output.Line.prototype.linePrefix;
_o_.output.Line.prototype.__defineGetter__('linePrefix', function() {
return this._linePrefix;
});
_o_.output.Line.prototype.__defineSetter__('linePrefix', function(value) {
this._linePrefix = value;
});
/** @type {string} */
_o_.output.Line.prototype.lineSuffix;
_o_.output.Line.prototype.__defineGetter__('lineSuffix', function() {
return this._lineSuffix;
});
_o_.output.Line.prototype.__defineSetter__('lineSuffix', function(value) {
this._lineSuffix = value;
});
/** @type {!Array.<string>} */
_o_.output.Line.prototype.tailComment;
_o_.output.Line.prototype.__defineGetter__('tailComment', function() {
return this._tailComment;
});
_o_.output.Line.prototype.__defineSetter__('tailComment', function(value) {
this._tailComment = value;
});

/** @type {boolean} */
_o_.output.Line.prototype.empty;
_o_.output.Line.prototype.__defineGetter__('empty', function() {
  var self = this;
  return (self._lines.empty && !self._linePrefix && !self._lineSuffix);
});

/** @param {string} line */
_o_.output.Line.prototype.appendLine = function(line) {
  var self = this;
  self._lines.appendStr(line);
  self._lines.terminateLine();
};

/** @type {!Array.<string>} */
_o_.output.Line.prototype.output;
_o_.output.Line.prototype.__defineGetter__('output', function() {
  var self = this;
  var out;
  out = new _o_.output.IndentedMultiline(self._indent);
  out.appendAll(self._prefixLines);
  out.appendLine(self._linePrefix, false);
  self._lines.lines.forEach(
  /**
   * @param {string|!_o_.output.Block} line
   * @param {number} i
   */
  function(line, i) {
    if (line instanceof _o_.output.Block) {
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
  return (out.output);
});
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.output.Multiline = function() {
  var self = this;
  /** @private {!Array.<!_o_.output.Block|string>} */
  this._lines = ([]);
  /** @private {boolean} */
  this._lastLineOpen = (false);
};
_o_.output.Multiline.prototype._classname = '_o_.output.Multiline';
/** @type {!Array.<!_o_.output.Block|string>} */
_o_.output.Multiline.prototype.lines;
_o_.output.Multiline.prototype.__defineGetter__('lines', function() {
return this._lines;
});

/** @type {boolean} */
_o_.output.Multiline.prototype.empty;
_o_.output.Multiline.prototype.__defineGetter__('empty', function() {
  var self = this;
  return (!self._lines.length);
});

/** @param {string} line */
_o_.output.Multiline.prototype.appendStr = function(line) {
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
_o_.output.Multiline.prototype.appendLines = function(lines) {
  var self = this;
  lines.forEach(
  /** @param {string} line */
  function(line) {
    self.appendStr(line);
    self.terminateLine();
  });
};

_o_.output.Multiline.prototype.terminateLine = function() {
  var self = this;
  self._lastLineOpen = false;
};

/** @param {!_o_.output.Block} block */
_o_.output.Multiline.prototype.appendBlock = function(block) {
  var self = this;
  self._lines.push(block);
  self._lastLineOpen = false;
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.ParserRunner = function() {
var self = this;
};
_o_.parser.ParserRunner.prototype._classname = '_o_.parser.ParserRunner';

/**
 * @param {!Array.<!_o_.input.Line>|string} lines
 * @param {!Object} params
 * @return {!_o_.parser.TokenList|!Array|!Object|string}
 */
_o_.parser.ParserRunner.prototype.run = function(lines, params) {
  var self = this;
  if (!(lines instanceof Array)) {
    lines = [new _o_.input.Line('', lines, 0)];
  }

  var input_lines;
  input_lines = lines.map(
  /** @param {!_o_.input.Line} l */
  function(l) {
    return (l.line);
  }).join('\n');

  try {
    return (_parser.parse(input_lines, params));
  }
  catch (e) {
    throw self._addContextLines(e, lines);
  }
};

/**
 * @param {!Object} e
 * @param {!Array.<!_o_.input.Line>} line
 * @private
 */
_o_.parser.ParserRunner.prototype._addContextLines = function(e, line) {
  var self = this;
  e.contextLines = [];
  line.forEach(
  /**
   * @param {!_o_.input.Line} l
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
  return (e);
};
/*
Container and interface of the TokenList to the rest of the converter.
*/
/**
 * @param {!_o_.parser.TokenList} tokens
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.Result = function(tokens) {
  var self = this;
  /** @private {!_o_.parser.TokenList} */
  this._tokens = tokens;
};
_o_.parser.Result.prototype._classname = '_o_.parser.Result';
/** @type {!_o_.parser.TokenList} */
_o_.parser.Result.prototype.tokens;
_o_.parser.Result.prototype.__defineGetter__('tokens', function() {
return this._tokens;
});

/** @type {!Array.<!_o_.parser.BlockMarker|string>} */
_o_.parser.Result.prototype.code;
_o_.parser.Result.prototype.__defineGetter__('code', function() {
  var self = this;
  return (self._tokens.list);
});

/** @type {!Array.<string>} */
_o_.parser.Result.prototype.prevLines;
_o_.parser.Result.prototype.__defineGetter__('prevLines', function() {
  var self = this;
  return (self._tokens.prevLines);
});

/** @type {!Array.<string>} */
_o_.parser.Result.prototype.tailComment;
_o_.parser.Result.prototype.__defineGetter__('tailComment', function() {
  var self = this;
  return (self._tokens.nextLines);
});

/** @return {!Array.<string>} */
_o_.parser.Result.prototype.rendered = function() {
  var self = this;
  var lines;
  lines = [];
  self._tokens.prevLines.forEach(
  /** @param {!_o_.parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  var code_line;
  code_line = self._tokens.toString();
  if (code_line) {
    lines.push(code_line);
  }
  self._tokens.nextLines.forEach(
  /** @param {!_o_.parser.TokenList|string} line */
  function(line) {
    lines.push(line.toString());
  });
  return (lines);
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
_o_.parser.Target = function(rule) {
  var self = this;
  /** @private {string} */
  this._rule = rule;
  /** @private {!_o_.parser.ParserRunner} */
  this._runner = (new _o_.parser.ParserRunner());
};
_o_.parser.Target.prototype._classname = '_o_.parser.Target';

/**
 * @param {!Array.<!_o_.input.Line>|string} lines
 * @param {!_o_.LineTransformer} xformer
 * @return {!_o_.parser.Result}
 */
_o_.parser.Target.prototype.run = function(lines, xformer) {
  var self = this;
  return (new _o_.parser.TokenListBuilder((
    self._runner.run(lines, {
      'startRule': self._rule,
      'xformer': xformer
    })
  ), xformer).result());
};
/**
 * @param {!Array.<string>} ids
 * @param {string} type
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.TmplAndTypeLine = function(ids, type) {
  var self = this;
  /** @private {!Array.<string>} */
  this._ids = ids;
  /** @private {string} */
  this._type = type;
};
_o_.parser.TmplAndTypeLine.prototype._classname = '_o_.parser.TmplAndTypeLine';
/** @type {!Array.<string>} */
_o_.parser.TmplAndTypeLine.prototype.ids;
_o_.parser.TmplAndTypeLine.prototype.__defineGetter__('ids', function() {
return this._ids;
});
/** @type {string} */
_o_.parser.TmplAndTypeLine.prototype.type;
_o_.parser.TmplAndTypeLine.prototype.__defineGetter__('type', function() {
return this._type;
});
/**
 * @param {string} type
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.BlockMarker = function(type) {
  var self = this;
  // one character string.
  // a: array.
  // o: object.
  // p: param list.
  // f: anonymous function.
  /** @private {string} */
  this._type = type;
};
_o_.parser.BlockMarker.prototype._classname = '_o_.parser.BlockMarker';
/** @type {string} */
_o_.parser.BlockMarker.prototype.type;
_o_.parser.BlockMarker.prototype.__defineGetter__('type', function() {
return this._type;
});

/** @return {string} */
_o_.parser.BlockMarker.prototype.toString = function() {
  var self = this;
  return ('|#' + self._type + '|');
};


/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.TokenList = function() {
  var self = this;
  /** @private {!Array.<!_o_.parser.BlockMarker|string>} */
  this._list = ([]);
  /** @private {!Array.<string>} */
  this._prevLines = ([]);
  /** @private {!Array.<string>} */
  this._nextLines = ([]);
};
_o_.parser.TokenList.prototype._classname = '_o_.parser.TokenList';
/** @type {!Array.<!_o_.parser.BlockMarker|string>} */
_o_.parser.TokenList.prototype.list;
_o_.parser.TokenList.prototype.__defineGetter__('list', function() {
return this._list;
});
/** @type {!Array.<string>} */
_o_.parser.TokenList.prototype.prevLines;
_o_.parser.TokenList.prototype.__defineGetter__('prevLines', function() {
return this._prevLines;
});
/** @type {!Array.<string>} */
_o_.parser.TokenList.prototype.nextLines;
_o_.parser.TokenList.prototype.__defineGetter__('nextLines', function() {
return this._nextLines;
});

/** @type {boolean} */
_o_.parser.TokenList.prototype.isEmpty;
_o_.parser.TokenList.prototype.__defineGetter__('isEmpty', function() {
  var self = this;
  if (self._prevLines.length || self._nextLines.length) {
    return (false);
  }
  if (!self._list.length) {
    return (true);
  }
  if (self._list.length >= 2) {
    return (false);
  }
  return (!(self._list[0] instanceof _o_.parser.BlockMarker) && self._list[0] === '');
});

/**
 * @param {...*} args
 * @return {!_o_.parser.TokenList}
 */
_o_.parser.TokenList.prototype.add = function(args) {
  var self = this;
  args = Array.prototype.slice.call(arguments, 0);
  args.forEach(
  /** @param {*} arg */
  function(arg) {
    if (!arg) {
      return;
    }

    // Recursive cases.
    if (arg instanceof _o_.parser.TokenList) {
      arg.list.forEach(
      /** @param {!_o_.parser.BlockMarker|string} token */
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
      return;
    }
    if (arg instanceof Array) {
      arg.forEach(
      /** @param {!Array} token */
      function(token) {
        self.add(token);
      });
      return;
    }

    // Always append a marker.
    if (arg instanceof _o_.parser.BlockMarker) {
      self._list.push(arg);
      return;
    }

    // Should be a string. Append only if we can't add to the last element.
    var last;
    last = self._list.length - 1;
    if (!self._list.length || self._list[last] instanceof _o_.parser.BlockMarker) {
      self._list.push(arg);
      return;
    }
    self._list[last] += arg;
  });
  return (self);
};

/**
 * @param {!_o_.parser.TokenList|string} line
 * @return {!_o_.parser.TokenList}
 */
_o_.parser.TokenList.prototype.prepend = function(line) {
  var self = this;
  if (line instanceof _o_.parser.TokenList) {
    self._prevLines = self._prevLines.concat(line.prevLines);
    self._nextLines = self._nextLines.concat(line.nextLines);
  }
  var str;
  str = line.toString();
  str && self._prevLines.push(str);
  return (self);
};

/** @param {!_o_.parser.TokenList|string} line */
_o_.parser.TokenList.prototype.append = function(line) {
  var self = this;
  if (line instanceof _o_.parser.TokenList) {
    self._prevLines = self._prevLines.concat(line.prevLines);
    self._nextLines = self._nextLines.concat(line.nextLines);
  }
  var str;
  str = line.toString();
  str && self._nextLines.push(str);
  return (self);
};

/** @return {string} */
_o_.parser.TokenList.prototype.toString = function() {
  var self = this;
  return (self._list.join(''));
};

/*
String representation of the token list. Works only if there is no marker.
*/
/** @type {string} */
_o_.parser.TokenList.prototype.str;
_o_.parser.TokenList.prototype.__defineGetter__('str', function() {
  var self = this;
  return ((
    self._prevLines.join('')
  ) + (
    self._list.join('')
  ) + (
    self._nextLines.join('')
  ));
});


/**
 * @param {string} name
 * @param {boolean} isMember
 * @param {string} access
 * @param {string} type
 * @param {string} marker
 * @param {!_o_.parser.TokenList} init
 * @constructor
 * @extends {_o_.parser.TokenList}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.ParamLine = function(name, isMember, access, type, marker, init) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {boolean} */
  this._isMember = isMember;
  /** @private {string} */
  this._access = access;
  /** @private {string} */
  this._type = type;
  /** @private {string} */
  this._marker = marker;
  /** @private {!_o_.parser.TokenList} */
  this._init = init;
  _o_.parser.TokenList.call(this);
};
goog.inherits(_o_.parser.ParamLine, _o_.parser.TokenList);
_o_.parser.ParamLine.prototype._classname = '_o_.parser.ParamLine';
/** @type {string} */
_o_.parser.ParamLine.prototype.name;
_o_.parser.ParamLine.prototype.__defineGetter__('name', function() {
return this._name;
});
/** @type {boolean} */
_o_.parser.ParamLine.prototype.isMember;
_o_.parser.ParamLine.prototype.__defineGetter__('isMember', function() {
return this._isMember;
});
/** @type {string} */
_o_.parser.ParamLine.prototype.access;
_o_.parser.ParamLine.prototype.__defineGetter__('access', function() {
return this._access;
});
/** @type {string} */
_o_.parser.ParamLine.prototype.type;
_o_.parser.ParamLine.prototype.__defineGetter__('type', function() {
return this._type;
});
/** @type {string} */
_o_.parser.ParamLine.prototype.marker;
_o_.parser.ParamLine.prototype.__defineGetter__('marker', function() {
return this._marker;
});
/** @type {!_o_.parser.TokenList} */
_o_.parser.ParamLine.prototype.init;
_o_.parser.ParamLine.prototype.__defineGetter__('init', function() {
return this._init;
});

/** @return {string} */
_o_.parser.ParamLine.prototype.toString = function() {
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
  return (list.join(''));
};
/**
 * @param {!_o_.parser.TokenList|!Array|!Object|string} parsed
 * @param {!_o_.LineTransformer} xformer
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.parser.TokenListBuilder = function(parsed, xformer) {
  var self = this;
  /** @private {!_o_.parser.TokenList|!Array|!Object|string} */
  this._parsed = parsed;
  /** @private {!_o_.LineTransformer} */
  this._xformer = xformer;
  /** @private {!_o_.parser.TokenList} */
  this._tokens = (new _o_.parser.TokenList());
};
_o_.parser.TokenListBuilder.prototype._classname = '_o_.parser.TokenListBuilder';

/** @return {!_o_.parser.TokenList} */
_o_.parser.TokenListBuilder.prototype.build = function() {
  var self = this;
  self._buildRec(self._parsed);
  return (self._tokens);
};

/** @return {!_o_.parser.Result} */
_o_.parser.TokenListBuilder.prototype.result = function() {
  var self = this;
  self.build();
  return (new _o_.parser.Result(self._tokens));
};

/**
 * @param {!_o_.parser.TokenList|!Array|!Object|string} data
 * @private
 */
_o_.parser.TokenListBuilder.prototype._buildRec = function(data) {
  var self = this;
  if (data instanceof _o_.parser.ParamLine) {
    // TODO: Drop this renaming vars if possible.
    var t;
    t = self._tokens;
    self._tokens = data;
    self._tokens.add(t);
    return;
  }

  if (data instanceof _o_.parser.TokenList) {
    self._tokens.add(data);
    return;
  }

  if (data instanceof Array) {
    self._addArray(data);
    return;
  }

  if (data instanceof _o_.parser.BlockMarker) {
    self._tokens.add(data);
    return;
  }

  if (data instanceof Function) {
    self._tokens.add(data(self._tokens));
    return;
  }

  // Must be a string.
  if (data) {
    self._tokens.add(data);
  }
};

/**
 * @param {!Array} data
 * @private
 */
_o_.parser.TokenListBuilder.prototype._addArray = function(data) {
  var self = this;
  data.forEach(
  /** @param {!_o_.parser.TokenList|!Array|!Object|string} elem */
  function(elem) {
    self._buildRec(elem);
  });
};
/*
The pattern is expressed as a tree of RegExp, Arrays, and Objects.
RegExp should not include parens. Arrays are sequence of patterns.
Each member of Objects are converted to alternative pattens. The result Objects
will have field names mathcing these object field names.
There are two meta data in the Object.
_s (string) : suffix to the group, e.g. '?', '*', etc.
_w (boolean, default true): add any number of spaces '\s*' before and after.

The result of eval is either null (when the match afils), or an Object.
Object has resulting partial matches.

The regexp is always bound to both begenning and end (^ and $ added
automatically).

If 'global' flag is true, multiple match is possible.
  regex := &re.Compiler(pattern, true)
  m := regex.eval(input_str)
  while m && m.some_property
    ...do something with m...
    m = regex.eval(input_str)

To reset the RegExp object, do: regex.eval('')
*/

/**
 * @param {!Object} pattern
 * @param {boolean=} opt_global
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.Compiler = function(pattern, opt_global) {
  var self = this;
  /** @private {!Object} */
  this._pattern = pattern;
  /** @private {boolean} */
  this._global = opt_global === undefined ? (false) : opt_global;
  /** @private {!Array.<!_o_.re.Extractor|string|null>} */
  this._extractors = ([]);
  /** @private {!RegExp} */
  this._regex = (self._build());
};
_o_.re.Compiler.prototype._classname = '_o_.re.Compiler';

/**
 * @param {string} str
 * @return {!Object|null}
 */
_o_.re.Compiler.prototype.eval = function(str) {
  var self = this;
  var match;
  match = self._regex.exec(str);
  if (!match) {
    return (null);
  }

  var result;
  result = {};
  self._extractors.forEach(
  /**
   * @param {!_o_.re.Extractor|string|null} extractor
   * @param {number} i
   */
  function(extractor, i) {
    if (extractor instanceof _o_.re.Extractor) {
      result[extractor.name] = extractor.value(match[i]);
    }
    else if (extractor) {
      result[extractor] = match[i];
    }
  });
  return (result);
};

/**
 * @return {!RegExp}
 * @private
 */
_o_.re.Compiler.prototype._build = function() {
  var self = this;
  self._extractors.push(null);
  var regexp;
  regexp = self._buildReStr(self._pattern, null);
  if (!self._global) {
    regexp = '^' + regexp + '$';
  }
  //l(regexp, 'regexp')
  return (new RegExp(regexp, self._global ? 'g' : ''));
};

/**
 * @param {!Object} pattern
 * @param {!_o_.re.Matcher|null} matcher
 * @return {string}
 * @private
 */
_o_.re.Compiler.prototype._buildReStr = function(pattern, matcher) {
  var self = this;
  if (pattern instanceof RegExp) {
    self._extractors.push(null);
    var pstr;
    pstr = pattern.toString();
    return ('(' + pstr.substring(1, pstr.length - 1) + ')');
  }

  if (pattern instanceof Array) {
    self._extractors.push(null);
    return ('(' + pattern.map(
    /** @param {!Object} item */
    function(item) {
      return (self._buildReStr(item, matcher));
    }).join('') + ')');
  }

  if (pattern instanceof _o_.re.Matcher) {
    return (self._buildReStr(pattern.re(), pattern));
  }

  return (self._buildReStrWithMap(pattern, matcher));
};

/**
 * @param {!Object} pattern
 * @param {!_o_.re.Matcher|null} matcher
 * @private
 */
_o_.re.Compiler.prototype._buildReStrWithMap = function(pattern, matcher) {
  var self = this;
  self._extractors.push(null);
  var alts;
  alts = [];
  var name;
  for (name in pattern) {
    if (name === '_s' || name === '_w') {
      continue;
    }

    if (name !== '_') {
      self._setCurrent(name, matcher);
    }
    alts.push(self._buildReStr(pattern[name], matcher));
  }

  var opt;
  opt = pattern._s || '';
  var spc;
  spc = pattern['_w'] === false ? '' : '\\s*';
  return (spc + '(' + alts.join('|') + ')' + opt + spc);
};

/**
 * @param {string} name
 * @param {!_o_.re.Matcher|null} matcher
 * @private
 */
_o_.re.Compiler.prototype._setCurrent = function(name, matcher) {
  var self = this;
  self._extractors[self._extractors.length - 1] = matcher ? (
    new _o_.re.Extractor(name, matcher)
  ) : name;
};
/**
 * @param {string} name
 * @param {!_o_.re.Matcher} matcher
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.Extractor = function(name, matcher) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {!_o_.re.Matcher} */
  this._matcher = matcher;
};
_o_.re.Extractor.prototype._classname = '_o_.re.Extractor';
/** @type {string} */
_o_.re.Extractor.prototype.name;
_o_.re.Extractor.prototype.__defineGetter__('name', function() {
return this._name;
});

/** @param {string} match */
_o_.re.Extractor.prototype.value = function(match) {
  var self = this;
  return (self._matcher.interpret(match));
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.Matcher = function() {
var self = this;
};
_o_.re.Matcher.prototype._classname = '_o_.re.Matcher';

/** @return {!Object} */
_o_.re.Matcher.prototype.re = function() {
  var self = this;
  return ({});
};

/*
Default impl simply returns the match with no interpretation.
*/
/**
 * @param {string} match
 * @return {*}
 */
_o_.re.Matcher.prototype.interpret = function(match) {
  var self = this;
  return (match);
};
/**
 * @param {!_o_.FileScope} scope
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Generator = function(scope) {
  var self = this;
  /** @private {!_o_.FileScope} */
  this._scope = scope;
};
_o_.section.Generator.prototype._classname = '_o_.section.Generator';

/**
 * @param {!_o_.input.Line} header
 * @param {!Array.<!_o_.input.Line>} lines
 * @return {!_o_.section.Code}
 */
_o_.section.Generator.prototype.generate = function(header, lines) {
  var self = this;
  var sec;
  sec = null;
  var header_line;
  header_line = header.line.substr(1);
  if (![
    _o_.section.Variable.create,
    _o_.section.Constructor.create,
    _o_.section.Interface.create,
    _o_.section.Method.create,
    _o_.section.Accessor.create,
    _o_.section.Str.create,
    _o_.section.Global.create,
    _o_.section.Native.create,
    _o_.section.Scope.create,
    _o_.section.Typedef.create
  ].some(
  /** @param {!Function} method */
  function(method) {
    sec = method.call(undefined, self._scope, header_line, header);
    if (sec) {
      sec.lines = lines;
      sec.close(self._scope.context.fileName, self._scope.context.pkg);
      sec.setType(self._scope.types);
    }
    return (!!sec);
  })) {
    _o_.error(header, 'line starts with colon and not a code section marker');
  }
  return (sec);
};
/*
TODO: Make this an interface.
*/
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Head = function() {
  var self = this;
  /** @private {!Array.<!_o_.IndentBlock>} */
  this._blocks = ([]);
};
_o_.section.Head.prototype._classname = '_o_.section.Head';
/** @type {!Array.<!_o_.IndentBlock>} */
_o_.section.Head.prototype.blocks;
_o_.section.Head.prototype.__defineGetter__('blocks', function() {
return this._blocks;
});

/** @param {!_o_.IndentBlock} block */
_o_.section.Head.prototype.addBlock = function(block) {
  var self = this;
  self._blocks.push(block);
};

/** @return {number} */
_o_.section.Head.prototype.numBlocks = function() {
  var self = this;
  return (self._blocks.length);
};

/**
 * @param {number} index
 * @return {!_o_.IndentBlock}
 */
_o_.section.Head.prototype.block = function(index) {
  var self = this;
  return (self._blocks[index]);
};

/** @return {!_o_.IndentBlock} */
_o_.section.Head.prototype.lastBlock = function() {
  var self = this;
  return (self._blocks[self._blocks.length - 1]);
};

/*
Do all the work necessary to produce code output.
*/
_o_.section.Head.prototype.transform = function() {
var self = this;
};

/*
Needs to be overridden.
*/
_o_.section.Head.prototype.output = function() {
  var self = this;
  return ([]);
};
/**
 * @param {string} str
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Implements = function(str) {
  var self = this;
  /** @private {string} */
  this._str = str;
};
_o_.section.Implements.prototype._classname = '_o_.section.Implements';

_o_.section.Implements.create = /**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} line
 * @param {string} str
 * @return {!Array.<!_o_.section.Implements>}
 */
function(context, line, str) {
  if (!str) {
    return ([]);
  }
  var impls;
  impls = new _o_.type.ImplementsParser(context, line, str).parse();
  _o_.l(impls, 'impls');
  return (impls.map(
  /** @param {string} impl */
  function(impl) {
    return (new _o_.section.Implements(impl));
  }));
};

/** @return {string} */
_o_.section.Implements.prototype.ctorOutput = function() {
  var self = this;
  return ('@implements {' + self._str + '}');
};

/** @return {string} */
_o_.section.Implements.prototype.ifaceOutput = function() {
  var self = this;
  return ('@extends {' + self._str + '}');
};
/**
 * @param {string} name
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.Callable = function(name) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {string} */
  this._parent = ('');
  /** @private {!Array.<!_o_.type.Callable>} */
  this._methods = ([]);
  /** @private {!Array.<string|null>} */
  this._args = ([]);
};
_o_.type.Callable.prototype._classname = '_o_.type.Callable';
/** @type {string} */
_o_.type.Callable.prototype.parent;
_o_.type.Callable.prototype.__defineGetter__('parent', function() {
return this._parent;
});
_o_.type.Callable.prototype.__defineSetter__('parent', function(value) {
this._parent = value;
});

/** @param {string} name */
_o_.type.Callable.prototype.addMethod = function(name) {
  var self = this;
  var m;
  m = new _o_.type.Callable(name);
  self._methods.push(m);
  return (m);
};

/** @param {string|null} arg */
_o_.type.Callable.prototype.addArg = function(arg) {
  var self = this;
  self._args.push(arg);
};

/** @return {!Object} */
_o_.type.Callable.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {'name': self._name, 'args': self._args};
  if (self._parent) {
    obj['parent'] = self._parent;
  }
  if (self._methods) {
    obj['methods'] = self._methods.map(
    /** @param {!_o_.type.Callable} m */
    function(m) {
      return (m.extract());
    });
  }
  return (obj);
};
/**
 * @param {!_o_.context.Package} pkg
 * @param {string} type
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.Decoder = function(pkg, type) {
  var self = this;
  /** @private {!_o_.context.Package} */
  this._pkg = pkg;
  /** @private {string} */
  this._type = type;
  /** @private {string} */
  this._decoded = ('');
  self._process();
};
_o_.type.Decoder.prototype._classname = '_o_.type.Decoder';

/** @private */
_o_.type.Decoder.prototype._process = function() {
  var self = this;
  self._decoded = self._pkg.replaceStr(self._type);
  // TODO: Drop this.
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
_o_.type.Decoder.prototype.output = function() {
  var self = this;
  return (self._decoded);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @param {string} type_str
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.ImplementsParser = function(context, input, type_str) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {string} */
  this._type_str = type_str;
  /** @private {!_o_.parser.ParserRunner} */
  this._runner = (new _o_.parser.ParserRunner());
};
_o_.type.ImplementsParser.prototype._classname = '_o_.type.ImplementsParser';

/** @return {!Array.<string>} */
_o_.type.ImplementsParser.prototype.parse = function() {
  var self = this;
  return (self._reduce(self._runner.run(self._type_str, {
    'startRule': 'Implements',
    'xformer': new _o_.LineTransformer(self._context, self._input)
  })));
};

/**
 * @param {*} list
 * @private
 */
_o_.type.ImplementsParser.prototype._reduce = function(list) {
  var self = this;
  return (self._unwrap(self._clean(list), 2).map(
  /** @param {*} item */
  function(item) {
    return (self._reduceToStr(item));
  }));
};

/*
Clean up the tree of arrays so that there is no null, undefined, or array with
zero elements.
*/
/**
 * @param {*} list
 * @private
 */
_o_.type.ImplementsParser.prototype._clean = function(list) {
  var self = this;
  if (!(list instanceof Array)) {
    return (list);
  }
  var result;
  result = list.map(
  /** @param {*} item */
  function(item) {
    return (self._clean(item));
  }).filter(
  /** @param {*} item */
  function(item) {
    return ((
      (item !== null) &&
      (item !== undefined) &&
      (!(item instanceof Array) || item.length > 0)
    ));
  });
  return (result);
};

/*
Given a cleaned tree of arrays, returns an array of multiple elements.
Only if there is only one element to the leaf, retuns the one item array.
*/
/**
 * @param {*} list
 * @param {number} depth
 * @private
 */
_o_.type.ImplementsParser.prototype._unwrap = function(list, depth) {
  var self = this;
  if (!(list instanceof Array)) {
    return ([list]);
  }
  if (list.length === 1 && depth > 0) {
    return (self._unwrap(list[0], depth - 1));
  }
  return (list);
};

/**
 * @param {*} list
 * @private
 */
_o_.type.ImplementsParser.prototype._reduceToStr = function(list) {
  var self = this;
  var r;
  r = [];
  self._reduceRec(list, r);
  return (r.join(''));
};

/**
 * @param {*} list
 * @param {!Array} result
 * @private
 */
_o_.type.ImplementsParser.prototype._reduceRec = function(list, result) {
  var self = this;
  if (list instanceof Array) {
    list.forEach(
    /** @param {*} item */
    function(item) {
      var r;
      r = self._reduceRec(item, result);
    });
  }
  else {
    result.push(list);
  }
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @param {string} type_str
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.Parser = function(context, input, type_str) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {string} */
  this._type_str = type_str;
};
_o_.type.Parser.prototype._classname = '_o_.type.Parser';

_o_.type.Parser.TYPE_PARSER = null;

/** @return {string} */
_o_.type.Parser.prototype.parse = function() {
  var self = this;
  _o_.type.Parser.TYPE_PARSER = _o_.type.Parser.TYPE_PARSER || new _o_.parser.Target('TypeExpression');
  try {
    return (_o_.type.Parser.TYPE_PARSER.run(
      self._type_str,
      new _o_.LineTransformer(self._context, self._input)
    ).rendered().join(''));
  }
  catch (e) {
    _o_.error(self._input, '(syntax error) ' + e.message, e.contextLines);
  }
};
/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.Set = function() {
  var self = this;
  /** @private {!_o_.type.Callable|null} */
  this._ctor = (null);
  /** @private {!Array} */
  this._classes = ([]);
  /** @private {!Array} */
  this._functs = ([]);
};
_o_.type.Set.prototype._classname = '_o_.type.Set';

/**
 * @param {string} name
 * @return {!_o_.type.Callable|null}
 */
_o_.type.Set.prototype.addCtor = function(name) {
  var self = this;
  self._ctor = new _o_.type.Callable(name);
  self._classes.push(self._ctor);
  return (self._ctor);
};

/**
 * @param {string} name
 * @return {!_o_.type.Callable}
 */
_o_.type.Set.prototype.addFunct = function(name) {
  var self = this;
  var fn;
  fn = new _o_.type.Callable(name);
  self._functs.push(fn);
  return (fn);
};

/** @return {!_o_.type.Callable|null} */
_o_.type.Set.prototype.getCurrentCtor = function() {
  var self = this;
  return (self._ctor);
};

/** @param {string} parent_name */
_o_.type.Set.prototype.setParent = function(parent_name) {
  var self = this;
  if (!self._ctor) {
    throw 'set parent called w/o ctor.';
  }
  self._ctor.parent = parent_name;
};

/** @return {!Object} */
_o_.type.Set.prototype.extract = function() {
  var self = this;
  var obj;
  obj = {};
  if (self._classes) {
    obj['cls'] = self._classes.map(
    /** @param {!_o_.type.Set} cls */
    function(cls) {
      return (cls.extract());
    });
  }
  if (self._functs) {
    obj['fns'] = self._functs.map(
    /** @param {!_o_.type.Callable} fn */
    function(fn) {
      return (fn.extract());
    });
  }
  return (obj);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @param {string} type_str
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.type.SingleParser = function(context, input, type_str) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {string} */
  this._type_str = type_str;
};
_o_.type.SingleParser.prototype._classname = '_o_.type.SingleParser';

_o_.type.SingleParser.SINGLE_PARSER = null;

/** @return {string} */
_o_.type.SingleParser.prototype.parse = function() {
  var self = this;
  _o_.type.SingleParser.SINGLE_PARSER = _o_.type.SingleParser.SINGLE_PARSER || new _o_.parser.Target('TypeInstantiation');
  try {
    return (_o_.type.SingleParser.SINGLE_PARSER.run(
      self._type_str,
      new _o_.LineTransformer(self._context, self._input)
    ).rendered().join(''));
  }
  catch (e) {
    _o_.error(self._input, '(syntax error) ' + e.message, e.contextLines);
  }
};
_o_.CODE_PARSER = null;

/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} input
 * @param {!_o_.LineParser} lineParsed
 * @constructor
 * @extends {_o_.section.Head}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.CodeLine = function(context, input, lineParsed) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._input = input;
  /** @private {!_o_.LineParser} */
  this._lineParsed = lineParsed;
  /** @private {!_o_.parser.Result|null} */
  this._parsed = (null);
  /** @private {!Array.<!_o_.CodeLine>} */
  this._continueLines = ([]);
  /** @private {!_o_.Param|boolean|null} */
  this._param = (null);
  /** @private {!_o_.BlockMatcher|null} */
  this._matcher = (null);
  _o_.section.Head.call(this);
};
goog.inherits(_o_.CodeLine, _o_.section.Head);
_o_.CodeLine.prototype._classname = '_o_.CodeLine';
/** @type {!_o_.input.Line} */
_o_.CodeLine.prototype.input;
_o_.CodeLine.prototype.__defineGetter__('input', function() {
return this._input;
});
/** @type {!Array.<!_o_.CodeLine>} */
_o_.CodeLine.prototype.continueLines;
_o_.CodeLine.prototype.__defineGetter__('continueLines', function() {
return this._continueLines;
});
_o_.CodeLine.prototype.__defineSetter__('continueLines', function(value) {
this._continueLines = value;
});
/** @type {!_o_.Param|boolean|null} */
_o_.CodeLine.prototype.param;
_o_.CodeLine.prototype.__defineGetter__('param', function() {
return this._param;
});
_o_.CodeLine.prototype.__defineSetter__('param', function(value) {
this._param = value;
});

/** @type {string} */
_o_.CodeLine.prototype.str;
_o_.CodeLine.prototype.__defineGetter__('str', function() {
  var self = this;
  return (self._input.line);
});

/** @type {number} */
_o_.CodeLine.prototype.indent;
_o_.CodeLine.prototype.__defineGetter__('indent', function() {
  var self = this;
  return (self._lineParsed.indent);
});

/** @type {boolean} */
_o_.CodeLine.prototype.isContinuation;
_o_.CodeLine.prototype.__defineGetter__('isContinuation', function() {
  var self = this;
  return (self._lineParsed.isContinuation);
});

/** @type {boolean} */
_o_.CodeLine.prototype.isBlockStatement;
_o_.CodeLine.prototype.__defineGetter__('isBlockStatement', function() {
  var self = this;
  return (self._matcher.isBlockStatement);
});

/** @type {!_o_.parser.Result|null} */
_o_.CodeLine.prototype.parsed;
_o_.CodeLine.prototype.__defineGetter__('parsed', function() {
  var self = this;
  if (self.isContinuation) {
    _o_.error(self._input, 'parse requested for cont. line');
  }
  if (!self._parsed) {
    // TODO: need to use different parsing targets.
    // e.g. parameter init and section.Variable need to be parsed as rhs value.
    _o_.CodeLine.CODE_PARSER = _o_.CodeLine.CODE_PARSER || new _o_.parser.Target('ParseLine');
    var lines;
    lines = [self._input].concat(self._continueLines);
    try {
      self._parsed = _o_.CodeLine.CODE_PARSER.run(
        lines,
        new _o_.LineTransformer(self._context, self._input)
      );
    }
    catch (e) {
      _o_.error(self._input, '(syntax error) ' + e.message, e.contextLines);
    }
  }
  return (self._parsed);
});

_o_.CodeLine.prototype.transform = function() {
  var self = this;
  var code;
  code = (self._param && self._param !== true && self._param.valueLine) || self.parsed.code;

  self._matcher = new _o_.BlockMatcher(self._context, self._input, code, self.blocks);
  self._matcher.transform();
};

/** @return {!_o_.output.Line} */
_o_.CodeLine.prototype.output = function() {
  var self = this;
  var out;
  out = new _o_.output.Line(self._input);
  if (self._param === true) {
    return (out);
  }

  out.lines.appendLines(self.parsed.prevLines.map(
  /** @param {string} line */
  function(line) {
    return (line + ';');
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
  return (out);
};
/**
 * @param {string=} opt_name
 * @param {boolean=} opt_opt
 * @constructor
 * @extends {_o_.re.Matcher}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.Id = function(opt_name, opt_opt) {
  var self = this;
  /** @private {string} */
  this._name = opt_name === undefined ? ('_') : opt_name;
  /** @private {boolean} */
  this._opt = opt_opt === undefined ? (false) : opt_opt;
};
goog.inherits(_o_.re.Id, _o_.re.Matcher);
_o_.re.Id.prototype._classname = '_o_.re.Id';
/** @type {string} */
_o_.re.Id.prototype.name;
_o_.re.Id.prototype.__defineGetter__('name', function() {
return this._name;
});

/** @override */
_o_.re.Id.prototype.re = function() {
  var self = this;
  var n;
  n = {};
  n[self._name] = /[a-zA-Z]\w*/;
  if (self._opt) {
    n['_s'] = '?';
  }
  return (n);
};
/**
 * @param {string=} opt_name
 * @constructor
 * @extends {_o_.re.Matcher}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.QualifiedId = function(opt_name) {
  var self = this;
  /** @private {string} */
  this._name = opt_name === undefined ? ('_') : opt_name;
};
goog.inherits(_o_.re.QualifiedId, _o_.re.Matcher);
_o_.re.QualifiedId.prototype._classname = '_o_.re.QualifiedId';
/** @type {string} */
_o_.re.QualifiedId.prototype.name;
_o_.re.QualifiedId.prototype.__defineGetter__('name', function() {
return this._name;
});

/** @override */
_o_.re.QualifiedId.prototype.re = function() {
  var self = this;
  var n;
  n = {};
  n[self._name] = /[\w\.\~]+/;
  return (n);
};
/**
 * @param {string=} opt_name
 * @constructor
 * @extends {_o_.re.Matcher}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.TmplVarList = function(opt_name) {
  var self = this;
  /** @private {string} */
  this._name = opt_name === undefined ? ('_') : opt_name;
};
goog.inherits(_o_.re.TmplVarList, _o_.re.Matcher);
_o_.re.TmplVarList.prototype._classname = '_o_.re.TmplVarList';
/** @type {string} */
_o_.re.TmplVarList.prototype.name;
_o_.re.TmplVarList.prototype.__defineGetter__('name', function() {
return this._name;
});

/** @override */
_o_.re.TmplVarList.prototype.re = function() {
  var self = this;
  var n;
  n = {};
  n[self._name] = /[\w\s\,]+/;
  return ({'_': [/\</, n, /\>/], '_s': '?'});
};

/**
 * @param {string} match
 * @return {*}
 */
_o_.re.TmplVarList.prototype.interpret = function(match) {
  var self = this;
  return (match ? match.split(',').map(
  /** @param {string} name */
  function(name) {
    return (name.trim());
  }) : []);
};
/**
 * @param {string=} opt_name
 * @constructor
 * @extends {_o_.re.Matcher}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.re.Type = function(opt_name) {
  var self = this;
  /** @private {string} */
  this._name = opt_name === undefined ? ('_') : opt_name;
};
goog.inherits(_o_.re.Type, _o_.re.Matcher);
_o_.re.Type.prototype._classname = '_o_.re.Type';
/** @type {string} */
_o_.re.Type.prototype.name;
_o_.re.Type.prototype.__defineGetter__('name', function() {
return this._name;
});

/** @override */
_o_.re.Type.prototype.re = function() {
  var self = this;
  var t;
  t = {};
  t[self._name] = /.*/;
  return ({'_': [/\\/, t, /\\/], '_s': '?'});
};
/**
 * @constructor
 * @extends {_o_.section.Head}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Code = function() {
  var self = this;
  /** @private {!Array.<!_o_.input.Line>} */
  this._lines = ([]);
  _o_.section.Head.call(this);
};
goog.inherits(_o_.section.Code, _o_.section.Head);
_o_.section.Code.prototype._classname = '_o_.section.Code';
/** @type {!Array.<!_o_.input.Line>} */
_o_.section.Code.prototype.lines;
_o_.section.Code.prototype.__defineGetter__('lines', function() {
return this._lines;
});
_o_.section.Code.prototype.__defineSetter__('lines', function(value) {
this._lines = value;
});

/*
Abstract method.
*/
/**
 * @param {string} file_name
 * @param {!_o_.context.Package=} pkg
 */
_o_.section.Code.prototype.close = function(file_name, pkg) {
  var self = this;
};

/** @param {!_o_.type.Set} types */
_o_.section.Code.prototype.setType = function(types) {
  var self = this;
};
/**
 * @constructor
 * @extends {_o_.section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Native = function() {
  var self = this;
  _o_.section.Code.call(this);
};
goog.inherits(_o_.section.Native, _o_.section.Code);
_o_.section.Native.prototype._classname = '_o_.section.Native';

_o_.section.Native.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @return {!_o_.section.Native|null}
 */
function(scope, line) {
  return (line === '~' ? new _o_.section.Native() : null);
};

/** @return {!Array.<!_o_.output.Line>} */
_o_.section.Native.prototype.output = function() {
  var self = this;
  return (self.lines.map(
  /** @param {!_o_.input.Line} line */
  function(line) {
    var out;
    out = new _o_.output.Line(line);
    out.appendLine(line.trim);
    return (out);
  }));
};
/**
 * @constructor
 * @extends {_o_.section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Runnable = function() {
  var self = this;
  _o_.section.Code.call(this);
};
goog.inherits(_o_.section.Runnable, _o_.section.Code);
_o_.section.Runnable.prototype._classname = '_o_.section.Runnable';

/** @override */
_o_.section.Runnable.prototype.close = function(file_name, pkg) {
  var self = this;
  // TODO: necessary to create a new instance of context here?
  // take one in ctor like Callable?
  var c;
  c = new _o_.CodeScope(new _o_.context.Context(
    file_name,
    pkg || new _o_.context.Package('')
  ), self);
  c.process(self.lines);
};

/** @override */
_o_.section.Runnable.prototype.transform = function() {
  var self = this;
  _o_.assert(
    self.numBlocks() === 1,
    self.lines[0],
    'Runnable has ' + self.numBlocks() + ' blocks'
  );
  self.block(0).transform();
};

/**
 * @param {string} block_suffix
 * @return {!Array.<!_o_.output.Line>}
 */
_o_.section.Runnable.prototype.outputBody = function(block_suffix) {
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
  return (lines);
};
/**
 * @param {!_o_.context.Context} context
 * @constructor
 * @extends {_o_.section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Str = function(context) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {number} */
  this._indent = (-1);
  _o_.section.Code.call(this);
};
goog.inherits(_o_.section.Str, _o_.section.Code);
_o_.section.Str.prototype._classname = '_o_.section.Str';
/** @type {!_o_.context.Context} */
_o_.section.Str.prototype.context;
_o_.section.Str.prototype.__defineGetter__('context', function() {
return this._context;
});

_o_.section.Str.re = [
  /\'/,
  new _o_.re.Id('name')
];

_o_.section.Str.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @return {!_o_.section.Str|null}
 */
function(scope, line) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Str.re).eval(line);
  if (!m) {
    return (null);
  }

  return (new _o_.section.Str(scope.copyContextWithName(m.name)));
};

/*
same number of strings as @.lines.
*/
/** @return {!Array.<string>} */
_o_.section.Str.prototype.strlines = function() {
  var self = this;
  var result;
  result = [];
  self.lines.forEach(
  /** @param {!_o_.input.Line} line */
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
      _o_.error(line, 'inconsistent indentation');
      return;
    }
    result.push(line.line.substr(self._indent));
  });
  return (result);
};

/** @return {!Array.<!_o_.output.Line>} */
_o_.section.Str.prototype.output = function() {
  var self = this;
  var lines;
  lines = self.strlines();
  return ([
    self._context.name.decl + ' =',
    lines.map(
    /**
     * @param {string} line
     * @param {number} i
     */
    function(line, i) {
      var out;
      out = new _o_.output.Line(self.lines[i]);
      out.indent = self._indent;
      out.appendLine("'" + line + "\\n'" + (i === lines.length - 1 ? ';' : ' +'));
      return (out);
    })
  ]);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!_o_.input.Line} line
 * @param {number} scopeLevel
 * @param {boolean} isPrivate
 * @param {string} rhs
 * @constructor
 * @extends {_o_.section.Code}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Variable = function(context, line, scopeLevel, isPrivate, rhs) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {!_o_.input.Line} */
  this._line = line;
  /** @private {number} */
  this._scopeLevel = scopeLevel;
  /** @private {boolean} */
  this._isPrivate = isPrivate;
  /** @private {!_o_.CodeLine|null} */
  this._codeLine = (null);
  _o_.section.Code.call(this);
  var code_input;
  code_input = new _o_.input.Line(self._line.file, rhs, self._line.rowIndex);
  self._codeLine = new _o_.CodeLine(self._context, code_input, new _o_.LineParser(code_input));
};
goog.inherits(_o_.section.Variable, _o_.section.Code);
_o_.section.Variable.prototype._classname = '_o_.section.Variable';

_o_.section.Variable.re = [
  {'colons': /\:{0,2}/},
  {'private': /\@/, '_s': '?'},
  new _o_.re.Id('name'),
  /\=/,
  {'rest': /.*/}
];

_o_.section.Variable.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @param {!_o_.input.Line} header
 * @return {!_o_.section.Variable|null}
 */
function(scope, line, header) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Variable.re).eval(line);
  if (!m) {
    return (null);
  }

  var scope_level;
  scope_level = m.colons.length;
  var is_private;
  is_private = !!m['private'];

  if (scope_level === 2 && is_private) {
    _o_.error(header, 'global variable can not be private');
  }
  return (new _o_.section.Variable(
    scope.copyContextWithName(m.name),
    header,
    scope_level,
    is_private,
    m.rest
  ));
};

/** @override */
_o_.section.Variable.prototype.close = function() {
  var self = this;
  var c;
  c = new _o_.CodeScope(self._context, self);
  c.process(self.lines);
};

/** @override */
_o_.section.Variable.prototype.transform = function() {
  var self = this;
  self.blocks.forEach(
  /** @param {!_o_.IndentBlock} block */
  function(block) {
    if (block.hasValidLine) {
      self._codeLine.addBlock(block);
    }
  });
  self._codeLine.transform();
};

/** @return {!Array} */
_o_.section.Variable.prototype.output = function() {
  var self = this;
  if (self._scopeLevel === 0 && !self._context.cls) {
    _o_.error(self._line, 'class scope outside of class.');
  }
  var out;
  out = self._codeLine.output();
  out.linePrefix = self._context.scopedName(self._scopeLevel).decl + ' = ' + out.linePrefix;
  out.lineSuffix += ';';
  return ([out.output, self.blocks.map(
  /** @param {!_o_.IndentBlock} block */
  function(block) {
    return (block.hasValidLine ? [] : block.output());
  })]);
};
/**
 * @param {!_o_.context.Context} context
 * @param {string} returnType
 * @param {!Array.<string>} tmplVars
 * @constructor
 * @extends {_o_.section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Callable = function(context, returnType, tmplVars) {
  var self = this;
  /** @private {!_o_.context.Context} */
  this._context = context;
  /** @private {string} */
  this._returnType = returnType;
  /** @private {!Array.<string>} */
  this._tmplVars = tmplVars;
  /** @private {!_o_.ParamSet|null} */
  this._params = (null);
  _o_.section.Runnable.call(this);
};
goog.inherits(_o_.section.Callable, _o_.section.Runnable);
_o_.section.Callable.prototype._classname = '_o_.section.Callable';
/** @type {!_o_.context.Context} */
_o_.section.Callable.prototype.context;
_o_.section.Callable.prototype.__defineGetter__('context', function() {
return this._context;
});
/** @type {string} */
_o_.section.Callable.prototype.returnType;
_o_.section.Callable.prototype.__defineGetter__('returnType', function() {
return this._returnType;
});
/** @type {!Array.<string>} */
_o_.section.Callable.prototype.tmplVars;
_o_.section.Callable.prototype.__defineGetter__('tmplVars', function() {
return this._tmplVars;
});
/** @type {!_o_.ParamSet|null} */
_o_.section.Callable.prototype.params;
_o_.section.Callable.prototype.__defineGetter__('params', function() {
return this._params;
});
_o_.section.Callable.prototype.__defineSetter__('params', function(value) {
this._params = value;
});

/** @return {string} */
_o_.section.Callable.prototype.name = function() {
  var self = this;
  return (self._context.name.ref);
};

/** @override */
_o_.section.Callable.prototype.close = function() {
  var self = this;
  var c;
  c = new _o_.CodeScope(self._context, self);
  c.process(self.lines);
};

/** @override */
_o_.section.Callable.prototype.transform = function() {
  var self = this;
  _o_.assert(
    self.numBlocks() === 1,
    self.lines[0],
    'callable takes 1 block -- found ' + self.numBlocks()
  );
  self._params = new _o_.ParamSet(self._context, self.block(0));
  self._params.templateParams = self._tmplVars;
  self._params.transform();
  self._params.setReturnType(self._returnType);
  self.block(0).transform();
};

/** @return {string} */
_o_.section.Callable.prototype.outputFunc = function() {
  var self = this;
  return (self._context.name.decl + ' = function(' + self._params.outputParams() + ') {');
};
/**
 * @constructor
 * @extends {_o_.section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Global = function() {
  var self = this;
  _o_.section.Runnable.call(this);
};
goog.inherits(_o_.section.Global, _o_.section.Runnable);
_o_.section.Global.prototype._classname = '_o_.section.Global';

_o_.section.Global.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @return {!_o_.section.Global|null}
 */
function(scope, line) {
  return (line === '' ? new _o_.section.Global() : null);
};

/** @return {!Array} */
_o_.section.Global.prototype.output = function() {
  var self = this;
  return (self.outputBody(''));
};
/*
Anonymous scope.
*/
/**
 * @constructor
 * @extends {_o_.section.Runnable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Scope = function() {
  var self = this;
  _o_.section.Runnable.call(this);
};
goog.inherits(_o_.section.Scope, _o_.section.Runnable);
_o_.section.Scope.prototype._classname = '_o_.section.Scope';

_o_.section.Scope.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @return {!_o_.section.Scope|null}
 */
function(scope, line) {
  return (line === '##' ? new _o_.section.Scope() : null);
};

/** @return {!Array} */
_o_.section.Scope.prototype.output = function() {
  var self = this;
  return (['(function() {', self.outputBody('})();')]);
};
/**
 * @param {!_o_.context.Context} context
 * @constructor
 * @extends {_o_.section.Str}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Typedef = function(context) {
  var self = this;
  _o_.section.Str.call(this, context);
};
goog.inherits(_o_.section.Typedef, _o_.section.Str);
_o_.section.Typedef.prototype._classname = '_o_.section.Typedef';

_o_.section.Typedef.re = [
  /\!/,
  new _o_.re.Id('name')
];

_o_.section.Typedef.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @return {!_o_.section.Typedef|null}
 */
function(scope, line) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Typedef.re).eval(line);
  if (!m) {
    return (null);
  }
  return (new _o_.section.Typedef(scope.copyContextWithName(m.name)));
};

/** @return {!Array.<!_o_.output.Line>} */
_o_.section.Typedef.prototype.output = function() {
  var self = this;
  var out;
  out = new _o_.output.Line(self.lines[0]);
  out.indent = 0;
  out.lines.appendLines([
    _o_.docLines(['@typedef {' + (
      new _o_.type.Parser(self.context, self.lines[0], self.strlines().join('')).parse()
    ) + '}']),
    self.context.name.decl + ';'
  ]);
  return ([out]);
};
/*
Overriding accessor.
*/
/**
 * @param {!_o_.context.Context} context
 * @param {string} name
 * @param {string} return_type
 * @param {boolean} isGetter
 * @constructor
 * @extends {_o_.section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Accessor = function(context, name, return_type, isGetter) {
  var self = this;
  /** @private {string} */
  this._name = name;
  /** @private {boolean} */
  this._isGetter = isGetter;
  context.isMethod = true;
  _o_.section.Callable.call(this, context, return_type, []);
};
goog.inherits(_o_.section.Accessor, _o_.section.Callable);
_o_.section.Accessor.prototype._classname = '_o_.section.Accessor';

_o_.section.Accessor.re = [
  new _o_.re.Id('name'),
  {'accessType': /[+*]/},
  new _o_.re.Type('returnType')
];

_o_.section.Accessor.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @param {!_o_.input.Line} header
 * @return {!_o_.section.Accessor|null}
 */
function(scope, line, header) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Accessor.re).eval(line);
  if (!m) {
    return (null);
  }

  // we should have seen a ctor.
  if (!scope.context.cls) {
    _o_.error(header, 'accessor marker w/o class');
    return (null);
  }
  var ret_type;
  ret_type = m.returnType ? (
    new _o_.type.Parser(scope.context, header, m.returnType).parse()
  ) : '';
  var ctx;
  ctx = scope.copyContext(scope.context.cls.methodName(m.name));
  return (new _o_.section.Accessor(ctx, m.name, ret_type, m.accessType === '+'));
};

/** @return {!Array} */
_o_.section.Accessor.prototype.output = function() {
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
      _o_.error(self.lines[0], 'getter with no return type');
    }
    if (!self._isGetter && self.params.numParams !== 1) {
      _o_.error(self.lines[0], 'non-member setter should have one param');
    }

    var member_type;
    member_type = self._isGetter ? (
      new _o_.type.Decoder(self.context.pkg, self.returnType)
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
  return ([
    member.outputDecl(class_name),
    member.outputAccessor(class_name, self._isGetter, [
      _o_.whitespaces(self.block(0).indent) + 'var self = this;',
      self.outputBody('')
    ], self.params)
  ]);
};
/**
 * @param {!_o_.context.Context} context
 * @param {!Array.<string>} tmpl_vars
 * @param {string|null} parent
 * @param {string|null} parentFull
 * @param {!Array.<!_o_.section.Implements>} impls
 * @constructor
 * @extends {_o_.section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Constructor = function(context, tmpl_vars, parent, parentFull, impls) {
  var self = this;
  /** @private {string|null} */
  this._parent = parent;
  /** @private {string|null} */
  this._parentFull = parentFull;
  /** @private {!Array.<!_o_.section.Implements>} */
  this._impls = impls;
  context.isCtor = true;
  _o_.section.Callable.call(this, context, '', tmpl_vars);
  self._parentFull = self._parentFull ? self.context.pkg.replace(self._parentFull) : '';
};
goog.inherits(_o_.section.Constructor, _o_.section.Callable);
_o_.section.Constructor.prototype._classname = '_o_.section.Constructor';

_o_.section.Constructor.re = [
  /\:/,
  new _o_.re.Id('name', true),
  new _o_.re.TmplVarList('tmplVars'),
  {'_': [
    /\^/,
    new _o_.re.QualifiedId('parentName'),
    new _o_.re.TmplVarList('pTmplVars')
  ], '_s': '?'},
  {'_': [
    /\;/,
    {'rest': /.*/}
  ], '_s': '?'}
];

_o_.section.Constructor.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @param {!_o_.input.Line} header
 * @return {!_o_.section.Constructor|null}
 */
function(scope, line, header) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Constructor.re).eval(line);
  if (!m) {
    return (null);
  }

  scope.context.cls = new _o_.context.Class();
  var ctor;
  ctor = new _o_.section.Constructor(
    scope.copyContextWithName(m.name),
    m.tmplVars,
    m.parentName ? (
      new _o_.type.SingleParser(scope.context, header, m.parentName).parse()
    ) : null,
    m.parentName ? (
      new _o_.type.SingleParser(scope.context, header, m.parentName + (
        m['pTmplVars'].length ? '<' + m['pTmplVars'].join(',') + '>' : ''
      )).parse()
    ) : null,
    _o_.section.Implements.create(scope.context, header, m.rest || '')
  );
  scope.context.cls.ctor = ctor;
  scope.types.addCtor(ctor.name());
  if (m.parentName) {
    scope.types.setParent(ctor.parentName());
  }
  return (ctor);
};

/** @return {string} */
_o_.section.Constructor.prototype.parentName = function() {
  var self = this;
  return (/** @type {string} */(self._parentFull));
};

/** @override */
_o_.section.Constructor.prototype.transform = function() {
  var self = this;
  _o_.assert(self.numBlocks() === 1, self.lines[0]);
  self.params = new _o_.ParamSet(self.context, self.block(0), true);
  self.params.templateParams = self.tmplVars;
  self.params.transform();
  self.block(0).transform();
};

/** @return {!Array} */
_o_.section.Constructor.prototype.output = function() {
  var self = this;
  var decl;
  decl = self.params.outputDecls();
  decl.push('@constructor');
  var inherit;
  inherit = [];
  if (self._parentFull) {
    decl.push('@extends {' + self._parentFull + '}');
    inherit.push([
      'goog.inherits(' + self.context.name.ref + ', ' + self._parent + ');'
    ].join(''));
  }
  decl.push('@struct');
  decl.push('@suppress {checkStructDictInheritance}');
  self._impls.forEach(
  /** @param {!_o_.section.Implements} impl */
  function(impl) {
    decl.push(impl.ctorOutput());
  });
  return ([
    _o_.docLines(decl),
    self.outputFunc(),
    _o_.whitespaces(self.block(0).indent) + 'var self = this;',
    self.outputBody('};'),
    inherit,
    [
      self.context.name.property('_classname').decl,
      " = '",
      self.context.name.ref,
      "';"
    ].join(''),
    self.context.cls.outputAccessors()
  ]);
};

/** @override */
_o_.section.Constructor.prototype.setType = function(types) {
  var self = this;
  self.params.setArgTypes(types.getCurrentCtor());
};
/**
 * @param {!_o_.context.Context} context
 * @param {!Array.<string>} tmpl_vars
 * @param {!Array.<!_o_.section.Implements>} impls
 * @constructor
 * @extends {_o_.section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Interface = function(context, tmpl_vars, impls) {
  var self = this;
  // This is actually rendered as @extends.
  /** @private {!Array.<!_o_.section.Implements>} */
  this._impls = impls;
  context.isCtor = true;
  _o_.section.Callable.call(this, context, '', tmpl_vars);
};
goog.inherits(_o_.section.Interface, _o_.section.Callable);
_o_.section.Interface.prototype._classname = '_o_.section.Interface';

_o_.section.Interface.re = [
  /\:\?/,
  new _o_.re.Id('name', true),
  new _o_.re.TmplVarList('tmplVars'),
  {'_': [
    /\;/,
    {'rest': /.*/}
  ], '_s': '?'}
];

_o_.section.Interface.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @param {!_o_.input.Line} header
 * @return {!_o_.section.Interface|null}
 */
function(scope, line, header) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Interface.re).eval(line);
  if (!m) {
    return (null);
  }

  scope.context.cls = new _o_.context.Class(true);
  var ctor;
  ctor = new _o_.section.Interface(
    scope.copyContextWithName(m.name),
    m.tmplVars,
    _o_.section.Implements.create(scope.context, header, m.rest || '')
  );
  scope.context.cls.ctor = ctor;
  scope.types.addCtor(ctor.name());
  return (ctor);
};

/** @override */
_o_.section.Interface.prototype.transform = function() {
  var self = this;
  _o_.assert(self.numBlocks() === 0 || self.lines.length === 0, self.lines[0]);
};

/** @return {!Array} */
_o_.section.Interface.prototype.output = function() {
  var self = this;
  var decl;
  decl = ['@interface'];
  if (self.tmplVars.length > 0) {
    decl.push('@template ' + self.tmplVars.join(','));
  }
  self._impls.forEach(
  /** @param {!_o_.section.Implements} impl */
  function(impl) {
    decl.push(impl.ifaceOutput());
  });
  _o_.l(decl, 'decl');
  return ([
    _o_.docLines(decl),
    self.context.name.decl + ' = function() {};',
    [
      self.context.name.property('_classname').decl,
      " = '",
      self.context.name.ref,
      "';"
    ].join('')
  ]);
};
/**
 * @param {!_o_.context.Context} context
 * @param {string} return_type
 * @param {!Array.<string>} tmpl_vars
 * @param {boolean} overriding
 * @constructor
 * @extends {_o_.section.Callable}
 * @struct
 * @suppress {checkStructDictInheritance}
 */
_o_.section.Method = function(context, return_type, tmpl_vars, overriding) {
  var self = this;
  /** @private {boolean} */
  this._overriding = overriding;
  context.isMethod = true;
  _o_.section.Callable.call(this, context, return_type, tmpl_vars);
};
goog.inherits(_o_.section.Method, _o_.section.Callable);
_o_.section.Method.prototype._classname = '_o_.section.Method';

_o_.section.Method.re = [
  {'att': /\@/, '_s': '?'},
  new _o_.re.Id('name'),
  {'overriding': /\^/, '_s': '?'},
  new _o_.re.TmplVarList('tmplVars'),
  new _o_.re.Type('returnType')
];

_o_.section.Method.create = /**
 * @param {!_o_.FileScope} scope
 * @param {string} line
 * @param {!_o_.input.Line} header
 * @return {!_o_.section.Method|null}
 */
function(scope, line, header) {
  var m;
  m = new _o_.re.Compiler(_o_.section.Method.re).eval(line);
  if (!m) {
    return (null);
  }

  // we should have seen a ctor.
  if (!scope.context.cls) {
    _o_.error(header, 'method marker w/o class');
    return (null);
  }
  var ret_type;
  ret_type = m.returnType ? (
    new _o_.type.Parser(scope.context, header, m.returnType).parse()
  ) : '';
  return (new _o_.section.Method(
      scope.copyContext(scope.context.cls.methodName((m.att ? '_' : '') + m.name)),
      ret_type,
      m.tmplVars,
      !!m.overriding
  ));
};

/** @return {!Array} */
_o_.section.Method.prototype.output = function() {
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
  if (self.context.cls.isInterface) {
    return ([
      _o_.docLines(decls),
      self.context.name.decl + ' = function(' + self.params.outputParams() + ') {};'
    ]);
  }
  else {
    return ([
      _o_.docLines(decls),
      self.outputFunc(),
      _o_.whitespaces(self.block(0).indent) + 'var self = this;',
      self.outputBody('};')
    ]);
  }
};

/** @override */
_o_.section.Method.prototype.setType = function(types) {
  var self = this;
  self.params.setArgTypes(
    types.getCurrentCtor().addMethod(self.context.name.id)
  );
};
