UndefinedType = 'u' { return 'undefined'; }
NullType = '-' { return 'null'; }
BooleanType = 'b' { return 'boolean'; }
StringType = 's' { return 'string'; }
NumberType = 'n' { return 'number'; }
UniversalType = '*'

FunctionType = 'f' _
    params:('(' _ TypeParamList? _ ')')? _
    ret:(':' _ TypeAtom)?
    {
      if (!params && !ret) { return '!Function'; }
      var f = ['function', params ? params : '()'];
      ret && f.push(ret);
      return f;
    }

TypeParameter
  = t:TypeExpressionP _ '~' { return ['...[', t, ']']; }
  / t:TypeExpressionP _ '?' { return [t, '=']; }
  / TypeExpressionP

TypeParamList = TypeParameter _ (',' _ TypeParameter)*

ArrayType
  = 'A' _ '<' _ e:TypeExpression _ '>' { return ['!Array.<', e, '>']; }
  / 'A' { return '!Array'; }

ObjectType
  = 'O' _ '<' _ k:TypeExpression _ ',' _ v:TypeExpression _ '>' {
      return ['!Object.<', k, ',', v, '>'];
    }
  / 'O' _ '<' _ v:TypeExpression _ '>' {
      return ['!Object.<string,', v, '>'];
    }
  / 'O' { return '!Object'; }

RecordType = '{' _ TypePropertyList _ '}'

TypeProperty = Identifier _ ':' _ TypeExpression

TypePropertyList = TypeProperty _ (',' _ TypeProperty)*

TypeReservedWord
  = ReservedWord
  / 'Array'
  // TODO: For some reason this one doesn't work. Fix and add the test back in
  // type.test.
  // / 'Function'
  / 'Object'
  / 'boolean'
  / 'function'
  / 'null'
  / 'number'
  / 'string'
  / 'undefined'

TypeIdentifier = !TypeReservedWord n:IdentifierName { return n; }

TypePathComponent = Identifier / '%'+

QualifiedTypeId = (TypePathComponent '.')* TypeIdentifier {
      //return ['!', $.resolveType(id)];
      return ['!', text()];
    }

TypeName
  = UndefinedType
  / NullType
  / BooleanType
  / StringType
  / NumberType
  / UniversalType
  / FunctionType
  / ArrayType
  / ObjectType
  / RecordType
  / QualifiedTypeId

TypeAtom
  = TypeName
  / '(' _ TypeExpression _ ')'

TypeExpression = TypeAtom (_ '|' _ TypeAtom)*

TypeExpressionP = a:TypeAtom x:(_ '|' _ TypeAtom)* {
      return x.length > 0 ? ['(', a, x, ')'] : a;
    }
