#### 2.0.7

- Escape `cwd` parameter
- Escape shell parameters

#### 2.0.6

- Fix more typos
- Fix `.get`'s promise never resolving

#### 2.0.5

- Fix some typos

#### 2.0.4

- Fix `stdin` support in `.exec` and `.execCommand`

#### 2.0.3

- Return `code` and `signal` in `.execCommand` if `stream` is set to `both` and in `.exec`

#### 2.0.2

- Fix a publishing issue

#### 2.0.1

- Fix method name in README
- Stricter validation of config

#### 2.0.0

- Rewrite from CoffeeScript to JS
- Rename `.exec` to `.execCommand`
- Accept config in `.connect` instead of constructor
- Add new `.exec` method that formats given parameters automatically
- Do not return file contents in `.get` because we already write it to a file

#### 1.0.0

- Initial release
