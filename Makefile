PACKAGES_FILE=compiled/packages.js

NODE=nodejs
NODE_TEST=NODE_PATH=compiled/parser $(NODE)
NODE_SAVED=NODE_PATH=saved $(NODE) saved/ir2js.js

ALL_IR_SRCS=$(wildcard src/*.ir) $(wildcard src/*/*.ir)
IR_SRCS=$(filter-out %/test.ir,$(filter-out %/main.ir,$(ALL_IR_SRCS)))
JS_SRCS=$(patsubst %.ir,%.js,$(subst src,compiled,$(IR_SRCS)))
CNVT_JS_SRC=compiled/main.js
TEST_JS_SRC=compiled/test.js

TESTS=$(wildcard test/*)

SORTJS=$(NODE_SAVED) --stdout --sort

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

compiled/%.js: src/%.ir
	@mkdir -p `dirname $@`
	@$(NODE_SAVED) --basedir=src $^ $@


############################################################
# Converter targets.

test: compiled/parser/syntax.js compiled/ir2js_test.js
	@echo '===== TEST'
	$(NODE_TEST) compiled/ir2js_test.js $(TESTS)

compiled/ir2js_test.js: compiled/_ir2js_test.js $(PACKAGES_FILE)
	@echo '===== CAT ir2js_test'
	cat $(PACKAGES_FILE) node/imports.js `$(SORTJS) $(JS_SRCS)` $(TEST_JS_SRC) > $@


converter: compiled/ir2js.js compiled/parser/syntax.js

compiled/ir2js.js: compiled/_ir2js.js $(PACKAGES_FILE)
	@echo '===== CAT ir2js'
	cat $(PACKAGES_FILE) node/imports.js `$(SORTJS) $(JS_SRCS)` $(CNVT_JS_SRC) >$@


compiled/_ir2js_test.js: $(JS_SRCS) $(TEST_JS_SRC) $(PACKAGES_FILE)
	@echo '===== VERIFY ir2js_test: compiling'
	java $(CLOSURE_ARGS) --js_output_file $@ --js $(PACKAGES_FILE) \
	$(addprefix --js ,$(shell $(SORTJS) $(JS_SRCS))) \
	--js $(TEST_JS_SRC)

compiled/_ir2js.js: $(JS_SRCS) $(CNVT_JS_SRC) $(PACKAGES_FILE)
	@echo '===== VERIFY ir2js: compiling'
	java $(CLOSURE_ARGS) --js_output_file $@ --js $(PACKAGES_FILE) \
	$(addprefix --js ,$(shell $(SORTJS) $(JS_SRCS))) \
	--js $(CNVT_JS_SRC)

$(PACKAGES_FILE):
	$(NODE_SAVED) --pkglist --basedir=src $(ALL_IR_SRCS) > $@


############################################################
# Parser targets.

PARSER_TEST_SRCS=\
$(patsubst %.ir,%.js,$(subst src,compiled,$(wildcard src/parser/*.ir)))
PARSER_TEST_SRCS+=compiled/input/line.js

test_parse: compiled/parser/syntax.js compiled/parser_main.js
	@$(NODE_TEST) compiled/parser_main.js -p src/*.ir | grep '^X|'

parser_test: compiled/parser/syntax.js compiled/parser_main.js
	@$(NODE_TEST) compiled/parser_main.js -t src/parser/data/*

compiled/parser_main.js: $(PARSER_TEST_SRCS) src/parser/test.js $(PACKAGES_FILE)
	@echo '===== CAT parser_main'
	cat $(PACKAGES_FILE) $^ > $@

compiled/parser/syntax.js: src/parser/syntax.pegjs
	@echo '===== PEGJS syntax'
	@mkdir -p compiled/parser
	pegjs src/parser/syntax.pegjs $@


############################################################
# Misc.

update:
	make clean
	make test
	make converter
	cp compiled/ir2js.js saved
	cp compiled/parser/syntax.js saved
	make clean
	make test
	make converter
	diff compiled/ir2js.js saved/ir2js.js

clean:
	rm -rf compiled
