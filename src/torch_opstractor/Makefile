# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

.PHONY: all
all: extension

.PHONY: extension
extension:
	python setup.py develop --user

.PHONY: clean
clean:
	python setup.py clean

.PHONY: test
test:
	python test.py