.PHONY: run test check demo clean
run:
	python3 -m verixa serve
demo:
	python3 -m verixa serve --demo
test:
	python3 -m unittest discover -s tests -v
check: test
	python3 -m compileall -q verixa
	node --check verixa/static/app.js
clean:
	rm -rf build dist *.egg-info
