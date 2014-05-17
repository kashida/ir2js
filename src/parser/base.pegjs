////////////////////////////////////////////////////////////
// Grammar strings.

SourceCharacter = .

WhiteSpace 'whitespace' = ([\t\v\f \u00A0\uFEFF] / Zs)

LineTerminator 'end_of_line' = [\n\r\u2028\u2029] { return ''; }

IdentifierStart
  = UnicodeLetter
  / '$'
  / '_'
  / '\\' sequence:UnicodeEscapeSequence { return sequence; }

IdentifierPart
  = IdentifierStart
  / UnicodeCombiningMark
  / UnicodeDigit
  / UnicodeConnectorPunctuation
  / '\u200C' { return '\u200C'; } // zero-width non-joiner
  / '\u200D' { return '\u200D'; } // zero-width joiner

ReservedWord
  = (
    Keyword
  / FutureReservedWord
  / NullLiteral
  / BooleanLiteral
  ) !IdentifierPart

Keyword
  = 'break'
  / 'case'
  / 'catch'
  / 'continue'
  / 'debugger'
  / 'default'
  / 'delete'
  / 'else'
  / 'finally'
  / 'for'
  / 'each'
  / 'if'
  / 'instanceof'
  / 'in'
  / 'new'
  / 'switch'
  / 'throw'
  / 'try'
  / 'typeof'
  / 'while'

FutureReservedWord
  = 'class'
  / 'const'
  / 'do'
  / 'enum'
  / 'export'
  / 'extends'
  / 'function'
  / 'import'
  / 'return'
  / 'super'
  / 'var'
  / 'void'
  / 'with'

  // Strict mode reserved words.
  / 'implements'
  / 'let'
  / 'private'
  / 'public'
  / 'interface'
  / 'package'
  / 'protected'
  / 'static'
  / 'yield'

DecimalString
  = before:DecimalIntegerString
    '.'
    after:DecimalDigits?
    exponent:ExponentPart? {
      return before + '.' + (after || '') + (exponent || '');
    }
  / '.' after:DecimalDigits exponent:ExponentPart? {
      return '.' + after + (exponent || '');
    }
  / before:DecimalIntegerString exponent:ExponentPart? {
      return before + (exponent || '');
    }

DecimalIntegerString
  = '0' / digit:NonZeroDigit digits:DecimalDigits? {
      return digit + (digits || '');
    }

DecimalDigits
  = digits:DecimalDigit+ { return digits.join(''); }

DecimalDigit = [0-9]
NonZeroDigit = [1-9]
HexDigit = [0-9a-fA-F]

ExponentPart
  = indicator:ExponentIndicator integer:SignedInteger {
      return indicator + integer;
    }

ExponentIndicator = [eE]

SignedInteger
  = sign:[-+]? digits:DecimalDigits { return (sign || '') + digits; }

HexIntegerString
  = '0' [xX] digits:HexDigit+ { return '0x' + digits.join(''); }

DoubleStringCharacters
  = chr:DoubleStringCharacter+ { return chr.join(''); }

SingleStringCharacters
  = chr:SingleStringCharacter+ { return chr.join(''); }

DoubleStringCharacter
  = !('"' / '\\' / LineTerminator) chr:SourceCharacter { return chr; }
  / '\\' sequence:EscapeSequence { return '\\' + sequence;  }

SingleStringCharacter
  = !("'" / '\\' / LineTerminator) chr:SourceCharacter { return chr; }
  / '\\' sequence:EscapeSequence { return '\\' + sequence;  }

EscapeSequence
  = CharacterEscapeSequence
  / '0'
  / HexEscapeSequence
  / UnicodeEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter = ['"\\bfnrtv]

NonEscapeCharacter
  = (!EscapeCharacter / LineTerminator) chr:SourceCharacter { return chr; }

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / 'x'
  / 'u'

HexEscapeSequence
  = 'x' h1:HexDigit h2:HexDigit { return 'x' + h1 + h2; }

UnicodeEscapeSequence
  = 'u' h1:HexDigit h2:HexDigit h3:HexDigit h4:HexDigit {
      return 'u' + h1 + h2 + h3 + h4
    }

RegularExpressionBody
  = chr:RegularExpressionChar* { return chr.join(''); }

RegularExpressionChar
  = ![\\/[] chr:RegularExpressionNonTerminator { return chr; }
  / RegularExpressionBackslashSequence
  / RegularExpressionClass

RegularExpressionBackslashSequence
  = '\\' chr:RegularExpressionNonTerminator { return '\\' + chr; }

RegularExpressionNonTerminator
  = !LineTerminator chr:SourceCharacter { return chr; }

RegularExpressionClass
  = '[' chr:RegularExpressionClassChars ']' { return '[' + chr + ']'; }

RegularExpressionClassChars
  = chr:RegularExpressionClassChar* { return chr.join(''); }

RegularExpressionClassChar
  = ![\]\\] chr:RegularExpressionNonTerminator { return chr; }
  / RegularExpressionBackslashSequence

RegularExpressionFlags
  = part:IdentifierPart* { return part.join(''); }


////////////////////////////////////////////////////////////
// Basic tokens.

Comment 'comment'
  = '//' rest:(!LineTerminator SourceCharacter)* {
      return $.append('//' + rest.map(function(r) { return r[1]; }).join(''));
    }

Blank
  = spaces:(WhiteSpace / LineTerminator / Comment)+ {
      var ret = []
      spaces.forEach(function(e) {
        if (typeof(e) != 'string') {
          ret.push(e);
        }
      });
      return ret;
    }

_ = Blank?

__ = blank:Blank* { return [' ', blank]; }


PostfixOperator 'postfix_opr'
  = '++'
  / '--'

UnaryOperator 'unary_opr'
  = 'delete'
  / 'typeof'
  / '++'
  / '--'
  / '+'
  / '-'
  / '!'

MultiplicativeOperator 'multiplicative_opr'
  = op:('*' / '/' / '%') !'=' { return op; }

AdditiveOperator 'additive_opr'
  = '+' !('+' / '=') { return '+'; }
  / '-' !('-' / '=') { return '-'; }

RelationalOperator 'relational_opr'
  = '<='
  / '>='
  / '<'
  / '>'
  / 'instanceof'
  / 'in'

EqualityOperator 'equality_opr'
  = '==' { return '==='; }
  / '!=' { return '!=='; }

LogicalANDOperator
  = '&&' !'=' { return '&&'; }

LogicalOROperator
  = '||' !'=' { return '||'; }

AssignmentOperator 'assignment_opr'
  = '=' (!'=') { return '='; }
  / '*='
  / '/='
  / '%='
  / '+='
  / '-='

NewOperator 'new_opr'
  = '&' { return 'new'; }

IdentifierName 'identifier'
  = start:IdentifierStart part:IdentifierPart* {
      return start + part.join('');
    }

Identifier 'identifier'
  = !ReservedWord name:IdentifierName { return name; }

NullLiteral = 'null'

BooleanLiteral
  = 'true'
  / 'false'

NumericLiteral 'number'
  = literal:(HexIntegerString / DecimalString) !IdentifierStart {
      return literal;
    }

StringLiteral 'string'
  = str:('"' DoubleStringCharacters? '"' / "'" SingleStringCharacters? "'") {
      return str.join('');
    }

RegularExpressionLiteral 'regular expression'
  = '/' body:RegularExpressionBody '/' flags:RegularExpressionFlags {
      // Escape the first '*' to avoid '/*' (start of multi-line comment).
      return '/' + body.replace(/^\*/, '\\*') + '/' + flags;
    }

Self = '@' _ name:Identifier? { return name ? 'self._' + name : 'self'; }

CurrentPackage
  = percents:('%'+) _ '.' _ name:Identifier {
      return $.pkgRef(percents.join('') + '.' + name);
    }

BinaryOpBlockMarker
  = '#' op:('.' / '*' / '+' / '&&' / '||') {
      return $.marker(op);
    }

ArrayBlockMarker = '[' _ '#' _ ']' { return $.marker('a'); }
ObjectBlockMarker = '{' _ '#' _ '}' { return $.marker('o'); }
ParameterBlockMarker = '(' _ '#' _ ')' { return $.marker('p'); }
FunctionBlockMarker = '##' { return $.marker('f'); }
LineBlockMarker = '#' !('#' / '?') { return $.marker('l'); }
ConditionalBlockMarker = '#?' { return $.marker('c'); }

BlockMarker
  = BinaryOpBlockMarker
  / ArrayBlockMarker
  / ObjectBlockMarker
  / ParameterBlockMarker
  / FunctionBlockMarker
  / ConditionalBlockMarker
  / LineBlockMarker


