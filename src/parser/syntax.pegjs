////////////////////////////////////////////////////////////
// Entry points

ParamLine
  = member:'@'? _ name:Identifier _ access:[+*&]?  _
    type:TypeLiteral marker:[$?~]?
    init:(_ ConditionalExpression)? {
      return $.paramLine(
          name, !!member, access || '', type, marker || '', init);
    }

BlockSeparator
  = '--' { $.grammar = 's'; return '--'; }


ParseLine = _ BlockLine _

// This is for testing.
BlockLine
  = PropertyAssignment
  / TypeLiteralLine
  / ParamLine
  / Statement
  / BlockSeparator
  / _

FunctionBlockLine
  = TypeLiteralLine
  / ParamLine
  / Statement
  / BlockSeparator
  / _

ParamBodyBlockLine
  = ParamLine
  / Statement
  / BlockSeparator
  / _

BodyBlockLine
  = Statement
  / BlockSeparator
  / _
