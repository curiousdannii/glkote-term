# Makefile for testing glkote-term

# Default to running multiple jobs
JOBS := $(shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
MAKEFLAGS = "-j $(JOBS)"

# Add node bin scripts to path
PATH := $(shell npm bin):$(PATH)

CURL = curl -L -s -S

# Mark which rules are not actually generating files
.PHONY: all clean lint test

all: lint test

clean:
	rm tests/regtest.py

lint:
	eslint .

tests/regtest.py:
	$(CURL) -o tests/regtest.py https://raw.githubusercontent.com/erkyrath/plotex/master/regtest.py

# Run the test suite
test: tests/regtest.py
	cd tests && python regtest.py praxix.regtest
