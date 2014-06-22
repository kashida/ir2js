Statement
  = _ StatementLine _

StatementLine
  = ExpressionStatement
  / BlockStatement
  / ContinueStatement
  / BreakStatement
  / ReturnStatement
  / CaseStatement
  / DefaultStatement
  / ThrowStatement
  / DebuggerStatement

BlockStatement
  = stmt:(
    IfStatement
  / ElseIfStatement
  / ElseStatement
  / WhileStatement
  / ForStatement
  / EachStatement
  / SwitchStatement
  / TryStatement
  / CatchStatement
  / FinallyStatement) { return [stmt, $.marker('b')]; }

ExpressionStatement = Expression

IfStatement
  = 'if' _ cond:Expression { return ['if (', cond, ')']; }

ElseIfStatement
  = 'else' _ 'if' _ cond:Expression { return ['else if (', cond, ')']; }

ElseStatement = 'else'
WhileStatement = 'while' __ cond:Expression { return ['while (', cond, ')']; }

ForStatement
  = 'for' _
    initializer:Expression? _ ';' _
    test:Expression? _ ';' _
    counter:Expression? {
      return [
        $.prepend(initializer),
        'for (;',
        test ? [' ', test] : null,
        ';',
        counter ? [' ', counter] : null,
        ')',
      ];
    }

EachStatement
  = 'each' _ iter:Identifier _ 'in' _ collection:Expression {
      return [
        $.prepend(['var ', iter]),
        'for (', iter, ' in ', collection, ')'
      ];
    }

ContinueStatement = 'continue'
BreakStatement = 'break'

ReturnStatement
  = '=>' _ value:Expression? {
      // When there's a value, we need to add parenthesis so that
      // => ##
      // pattern will not produce a "return" in a line by itself (which will
      // be interpreted as no-value return statement).
      return value ? ['return (', value, ')'] : 'return';
    }

SwitchStatement
  = 'switch' _ expr:Expression { return ['switch (', expr, ')']; }

CaseStatement
  = 'case' _ selector:Expression _ { return ['case ', selector, ':']; }

DefaultStatement = 'default' { return 'default:'; }
ThrowStatement = 'throw' __ Expression
TryStatement = 'try'

CatchStatement
  = 'catch' _ identifier:Identifier { return ['catch (', identifier, ')']; }

FinallyStatement = 'finally'
DebuggerStatement = 'debugger'


