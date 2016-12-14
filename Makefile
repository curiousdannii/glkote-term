# Makefile for testing glkote-term

# Default to running multiple jobs
JOBS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
MAKEFLAGS = "-j $(JOBS)"

CURL = curl -L -s -S

# Mark which rules are not actually generating files
.PHONY: all clean test

all: test

clean:
	rm tests/praxix.z5

# Download Praxix and regtest
tests/praxix.z5:
	$(CURL) -o tests/praxix.z5 https://github.com/curiousdannii/if/raw/gh-pages/tests/praxix.z5

tests/regtest.py:
	$(CURL) -o tests/regtest.py https://raw.githubusercontent.com/erkyrath/plotex/master/regtest.py

# Run the test suite
test: tests/praxix.z5 tests/regtest.py
	cd tests && python regtest.py praxix.regtest
