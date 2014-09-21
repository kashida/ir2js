Literal
  = (
    NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral
  / RegularExpressionLiteral
  ) !IdentifierPart

PrimaryExpression
  = Self
  / CurrentPackage
  / CurrentClass
  / BlockMarker
  / Identifier
  / Literal
  / ArrayLiteral
  / ObjectLiteral
  / '(' _ Expression _ ')'

ArrayLiteral
  = '[' _ ElementList? _ ']'

ElementList
  = AssignmentExpression (_ ',' __ AssignmentExpression)*

ObjectLiteral
  = '{' _ PropertyNameAndValueList? _ '}'

PropertyNameAndValueList
  = PropertyAssignment (_ ',' __ PropertyAssignment)*

PropertyAssignment
  = name:PropertyName _ ':' _ value:AssignmentExpression {
      return [name, ': ', value];
    }

PropertyName
  = name:IdentifierName {
    return ["'", name, "'"]
  }
  / StringLiteral
  / NumericLiteral

MemberExpression
  = (
        PrimaryExpression
      / NewOperator __ MemberExpression _ Arguments
    )
    (
        _ '[' _ Expression _ ']'
      / _ '.' _ IdentifierName
    )*

NewExpression
  = MemberExpression
  / NewOperator __ NewExpression

CallInvocation
  = MemberExpression _ Arguments
  / '^' _ marker:ParameterBlockMarker {
      return $.parentCall(marker);
    }
  / '^' _ '(' _ args:ArgumentList? _ ')' {
      return $.parentCall(args);
    }

CallExpression
  = CallInvocation (
        _ Arguments
      / _ '[' _ Expression _ ']'
      / _ '.' _ IdentifierName
    )*

Arguments
  = ParameterBlockMarker
  / '(' _ ArgumentList? _ ')'

ArgumentList
  = AssignmentExpression (_ ',' __ AssignmentExpression)*

CastExpression
  = type:TypeLiteral _ '(' _ expr:AssignmentExpression _ ')' {
      return [$.cast(type), '(', expr, ')'];
    }

TypeLiteral
  = '\\' type:TypeExpression '\\' { return type; }

TypeLiteralLine
  = type:TypeLiteral _ !. { return $.type(type); }

LeftHandSideExpression
  = CallExpression
  / NewExpression
  / CastExpression

PostfixExpression
  = LeftHandSideExpression _ PostfixOperator
  / LeftHandSideExpression

UnaryExpression
  = PostfixExpression
  / UnaryOperator _ UnaryExpression

MultiplicativeExpression
  = UnaryExpression (__ MultiplicativeOperator __ UnaryExpression)*

AdditiveExpression
  = MultiplicativeExpression (__ AdditiveOperator __ MultiplicativeExpression)*

RelationalExpression
  = AdditiveExpression (__ RelationalOperator __ AdditiveExpression)*

EqualityExpression
  = RelationalExpression (__ EqualityOperator __ RelationalExpression)*

LogicalANDExpression
  = EqualityExpression (__ LogicalANDOperator __ EqualityExpression)*

LogicalORExpression
  = LogicalANDExpression (__ LogicalOROperator __ LogicalANDExpression)*

ConditionalExpression
  = LogicalORExpression __ '?' __
    AssignmentExpression __ ':' __ AssignmentExpression
  / LogicalORExpression

DeclareAssignmentExpression
  = left:Identifier _ ':=' _ right:AssignmentExpression {
      return [$.prepend(['var ', left]), left, ' = ', right]
    }

AssignmentExpression
  = LeftHandSideExpression __ AssignmentOperator __ AssignmentExpression
  / DeclareAssignmentExpression
  / ConditionalExpression

Expression
  = AssignmentExpression (_ ',' __ AssignmentExpression)*
