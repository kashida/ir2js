////////////////////////////////////////////////////////////
// Entry points

ParamLine
  = member:'@'? _ name:Identifier _ access:[+*&]?  _ '\\\\' marker:[$?~]? _
    type:QualifiedTypeId _ args:Arguments {
      return $.paramLine(
          name, !!member, access || '', ['!', type], marker || '',
          ['new ', $.type(type), args]);
    }
  / member:'@'? _ name:Identifier _ access:[+*&]?  _
    type:TypeLiteral marker:[$?~]?
    init:(_ ConditionalExpression)? {
      return $.paramLine(
          name, !!member, access || '', type, marker || '', init);
    }

TemplateAndTypeLiteralLine
  = tmpl:TemplateParams? type:TypeLiteralLine {
      return $.tmplAndTypeLine(tmpl, type);
    }

BlockSeparator
  = '--' { $.grammar = 's'; return '--'; }


ParseLine = _ BlockLine _

// This is for testing.
BlockLine
  = PropertyAssignment
  / TemplateAndTypeLiteralLine
  / ParamLine
  / Statement
  / BlockSeparator
  / _

FunctionBlockLine
  = TemplateAndTypeLiteralLine
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
