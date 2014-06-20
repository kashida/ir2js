PACKAGES_FILE=compiled/packages.js

NODE=nodejs
NODE_TEST=NODE_PATH=compiled $(NODE)
NODE_SAVED=NODE_PATH=saved $(NODE) saved/convert
PEGJS=node_modules/.bin/pegjs
PARSER_RULES=ParseLine,TypeExpression,Implements
TEST_RULES=BlockLine,BlockMarker,ParseLine,FunctionBlockLine,Expression,Statement,Comment,PrimaryExpression,NewExpression,CallExpression,MemberExpression,Identifier,Literal,NumericLiteral,StringLiteral,RegularExpressionLiteral,ObjectLiteral,AdditiveExpression,TypeLiteralLine,ParamLine,Implements

IR_SRCS=$(wildcard src/*.ir) $(wildcard src/*/*.ir)
JS_SRCS_WITH_TEST=$(patsubst %.ir,%.js,$(subst src,compiled,$(IR_SRCS)))
JS_SRCS=$(filter-out */TestCase.ir,$(JS_SRCS_WITH_TEST))
PEGJS_SRCS=src/parser/init.js $(wildcard src/parser/*.pegjs)

TESTS=$(wildcard test/*.test)

SORTJS=$(NODE_SAVED) --sort

PLAYPEN_TARGET=$(addprefix compiled/,$(wildcard playpen/*.js))

CLOSURE_ARGS=
CLOSURE_ARGS+=-jar closure/compiler.jar
CLOSURE_ARGS+=--externs misc/externs.js
CLOSURE_ARGS+=--formatting PRETTY_PRINT
CLOSURE_ARGS+=--compilation_level ADVANCED_OPTIMIZATIONS
CLOSURE_ARGS+=--summary_detail_level 3
CLOSURE_ARGS+=--warning_level VERBOSE
CLOSURE_ARGS+=--jscomp_error=accessControls
CLOSURE_ARGS+=--jscomp_error=ambiguousFunctionDecl
CLOSURE_ARGS+=--jscomp_error=checkRegExp
CLOSURE_ARGS+=--jscomp_error=checkTypes
CLOSURE_ARGS+=--jscomp_error=checkVars
CLOSURE_ARGS+=--jscomp_error=const
CLOSURE_ARGS+=--jscomp_error=constantProperty
CLOSURE_ARGS+=--jscomp_error=deprecated
CLOSURE_ARGS+=--jscomp_error=duplicateMessage
CLOSURE_ARGS+=--jscomp_error=es5Strict
CLOSURE_ARGS+=--jscomp_error=externsValidation
CLOSURE_ARGS+=--jscomp_error=fileoverviewTags
CLOSURE_ARGS+=--jscomp_error=globalThis
CLOSURE_ARGS+=--jscomp_error=internetExplorerChecks
CLOSURE_ARGS+=--jscomp_error=invalidCasts
CLOSURE_ARGS+=--jscomp_error=missingProperties
CLOSURE_ARGS+=--jscomp_error=nonStandardJsDocs
CLOSURE_ARGS+=--jscomp_error=strictModuleDepCheck
CLOSURE_ARGS+=--jscomp_error=typeInvalidation
CLOSURE_ARGS+=--jscomp_error=undefinedNames
CLOSURE_ARGS+=--jscomp_error=undefinedVars
CLOSURE_ARGS+=--jscomp_error=unknownDefines
CLOSURE_ARGS+=--jscomp_error=uselessCode
CLOSURE_ARGS+=--jscomp_error=visibility

default: test


############################################################
# ir to js targets.

compiled/%.js: src/%.ir
	@$(NODE_SAVED) --basedir=src --outdir=compiled $^

# TODO: Just supply js in misc (imports and base). convert command's merge
# option needs to accept js w/o accompanying tk.
compiled/%.js: misc/%.ir
	@$(NODE_SAVED) --basedir=misc --outdir=compiled $^

compiled/test.js: test/test.ir
	@$(NODE_SAVED) --basedir=test --outdir=compiled $^


############################################################
# Converter targets.

test: compiled/ir2js_test.js compiled/syntax.js compiled/test.js
	@echo '===== TEST'
	$(NODE_TEST) compiled/test.js $(TESTS)

compiled/ir2js_test.js: compiled/_ir2js.js compiled/imports.js compiled/base.js
	@echo '===== MERGE ir2js_test'
	$(NODE_SAVED) --merge --basedir=compiled --outfile=$@ \
	compiled/imports.js compiled/base.js $(JS_SRCS_WITH_TEST)


converter: compiled/ir2js.js compiled/syntax.js compiled/convert.js

sort:
	@echo "$(shell $(SORTJS) $(JS_SRCS))"

compiled/ir2js.js: compiled/_ir2js.js compiled/imports.js compiled/base.js
	@echo '===== MERGE ir2js'
	$(NODE_SAVED) --merge --basedir=compiled --outfile=$@ \
	compiled/imports.js compiled/base.js $(JS_SRCS)


compiled/_ir2js.js: $(JS_SRCS) $(PACKAGES_FILE) compiled/base.js
	@echo '===== VERIFY ir2js: compiling'
	java $(CLOSURE_ARGS) --js_output_file $@ --js $(PACKAGES_FILE) \
	--js compiled/base.js \
	$(addprefix --js ,$(shell $(SORTJS) $(JS_SRCS))) || \
	(rm -f $@ && false)

$(PACKAGES_FILE):
	@mkdir -p `dirname $@`
	$(NODE_SAVED) --pkglist --basedir=src $(IR_SRCS) > $@


############################################################
# Parser targets.

PARSER_TEST_SRCS=compiled/base.js \
$(patsubst %.ir,%.js,$(subst src,compiled,$(wildcard src/parser/*.ir)))
PARSER_TEST_SRCS+=compiled/input/Line.js

# Check if the parser can handle the ir2js source code itself.
parse_src: compiled/syntax_test.js compiled/parser_main.js
	@$(NODE_TEST) compiled/parser_main.js -p src/*.ir | grep '^X|'

# Run tests for the parser.
ptest: compiled/syntax_test.js compiled/parser_main.js
	@$(NODE_TEST) compiled/parser_main.js -t src/parser/data/*

compiled/parser_main.js: $(PARSER_TEST_SRCS) src/parser/test.js $(PACKAGES_FILE)
	@echo '===== CAT parser_main'
	cat $(PACKAGES_FILE) $^ > $@

compiled/syntax.pegjs: $(PEGJS_SRCS)
	@echo '===== PEGJS syntax'
	@mkdir -p compiled
	cat $^ > compiled/syntax.pegjs

compiled/syntax.js: compiled/syntax.pegjs
	$(PEGJS) --allowed-start-rules $(PARSER_RULES) $^ $@

compiled/syntax_test.js: compiled/syntax.pegjs
	$(PEGJS) --allowed-start-rules $(TEST_RULES) $^ $@


############################################################
# Experiments.

pp: $(PLAYPEN_TARGET)

compiled/playpen/%.js: playpen/%.js
	@echo '===== PLAYPEN ' $@ ' ====='
	@mkdir -p compiled/playpen
	java $(CLOSURE_ARGS) --js_output_file $@ --js $^ || \
	(rm -f $@ && false)


############################################################
# Misc.

update:
	make clean
	make test
	make ptest
	make converter
	cp compiled/ir2js.js saved
	echo '#!/usr/bin/env node' > saved/convert
	echo >> saved/convert
	cat compiled/convert.js >> saved/convert
	cp compiled/syntax.js saved
	make clean
	make test
	make converter
	diff compiled/ir2js.js saved/ir2js.js

clean:
	rm -rf compiled
