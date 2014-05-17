TypeExpression
  = chr:(!'\\' SourceCharacter)* {
      return chr.map(function(c) { return c[1]; }).join('');
    }
