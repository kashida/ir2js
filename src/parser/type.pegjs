UndefinedType = 'u' !Identifier { return 'undefined'; }
NullType = '-' { return 'null'; }
BooleanType = 'b' !Identifier { return 'boolean'; }
StringType = 's' !Identifier { return 'string'; }
NumberType = 'n' !Identifier { return 'number'; }
UniversalType = '*'

FunctionType = 'f' !Identifier _
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
  = 'A' !Identifier _ '<' _ e:TypeExpression _ '>' {
      return ['!Array.<', e, '>'];
    }
  / 'A' !Identifier { return '!Array'; }

ObjectType
  = 'O' !Identifier _ '<' _ k:TypeExpression _ ',' _ v:TypeExpression _ '>' {
      return ['!Object.<', k, ',', v, '>'];
    }
  / 'O' !Identifier _ '<' _ v:TypeExpression _ '>' {
      return ['!Object.<string,', v, '>'];
    }
  / 'O' !Identifier { return '!Object'; }

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

QualifiedTypeId = (TypePathComponent '.')* TypeIdentifier
      //return $.resolveType(id);

NonNullableTypeId = QualifiedTypeId { return ['!', text()]; }

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
  / NonNullableTypeId

TypeAtom
  = TypeName
  / '(' _ TypeExpression _ ')'

TypeExpression = TypeAtom (_ '|' _ TypeAtom)*

TypeExpressionP = a:TypeAtom x:(_ '|' _ TypeAtom)* {
      return x.length > 0 ? ['(', a, x, ')'] : a;
    }