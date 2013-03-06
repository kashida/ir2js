BASE_SRC=lib/closure_base.js

SRCS=$(patsubst %.ir,%.js,$(subst src,compiled,$(wildcard src/*.ir)))
JS_SRCS=$(filter-out %/test.js,$(filter-out %/main.js,$(SRCS)))
CNVT_JS_SRC=compiled/main.js
TEST_JS_SRC=compiled/test.js

TESTS=$(wildcard test/*)

SORTJS=nodejs saved/ir2js.js --stdout --sort

CLOSURE_ARGS=
CLOSURE_ARGS+=-jar closure/compiler.jar
CLOSURE_ARGS+=--externs node/externs.js
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


test: compiled/ir2js_test.js
	@echo '===== TEST'
	nodejs compiled/ir2js_test.js $(TESTS)

compiled/ir2js_test.js: compiled/_ir2js_test
	@echo '===== CAT ir2js_test'
	cat $(BASE_SRC) node/imports.js `$(SORTJS) $(JS_SRCS)` $(TEST_JS_SRC) > $@


converter: compiled/ir2js.js

compiled/ir2js.js: dir $(JS_SRCS) $(CNVT_JS_SRC)
	@echo '===== CAT ir2js'
	cat $(BASE_SRC) node/imports.js `$(SORTJS) $(JS_SRCS)` $(CNVT_JS_SRC) >$@


# TODO: run closure to verify only if files are updated.
compiled/_ir2js_test: dir $(JS_SRCS) $(TEST_JS_SRC)
	@echo '===== VERIFY ir2js_test: compiling'
	java $(CLOSURE_ARGS) --js_output_file compiled/_ir2js_test.js \
	--js $(BASE_SRC) \
	$(addprefix --js ,$(shell $(SORTJS) $(JS_SRCS))) \
	--js $(TEST_JS_SRC)

compiled/_ir2js: dir $(JS_SRCS) $(CNVT_JS_SRC)
	@echo '===== VERIFY ir2js: compiling'
	java $(CLOSURE_ARGS) --js_output_file compiled/_ir2js.js \
	--js $(BASE_SRC) \
	$(addprefix --js ,$(shell $(SORTJS) $(JS_SRCS))) \
	--js $(CNVT_JS_SRC)

test_parse: src/parser/test.js compiled/parser/syntax.js
	@NODE_PATH=compiled/parser nodejs src/parser/test.js -p src/*.ir | grep '^X|'

parser_test: src/parser/test.js compiled/parser/syntax.js
	@NODE_PATH=compiled/parser nodejs src/parser/test.js -t src/parser/data/*

compiled/parser/syntax.js: dir src/parser/syntax.pegjs
	pegjs src/parser/syntax.pegjs $@

compiled/%.js: src/%.ir
	nodejs saved/ir2js.js --basedir=src $^ $@

dir:
	mkdir -p compiled
	mkdir -p compiled/parser


update:
	make clean
	make test
	make converter
	cp compiled/ir2js.js saved/ir2js.js
	make clean
	make test
	make converter
	diff compiled/ir2js.js saved/ir2js.js

clean:
	rm -rf compiled
