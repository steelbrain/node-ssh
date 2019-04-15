#### 6.0.0

* Breaking upgrade to `ssh2` dependency
* Internal cleanup / testing system overhaul

#### 5.1.2

* Fix timeout issue with authentication

#### 5.1.1

* Fixed an issue with keyboard authentication validation

#### 5.1.0

* Add keyboard authentication support (Thanks @dominiklessel)

#### 5.0.0

* Add `onStdout`, `onStderr` to `exec{,Command}`
* Change signature of `put{Files,Directory}` methods
* Create empty directories remotely in `putDirectory`

#### 4.3.3

* Fix passing options in `execCommand`

#### 4.2.2

* Fix put directory for long paths
* Add tests for long paths in test suite

#### 4.2.1

* Remove `mkdirp` in favor of homegrown solution to fix compatibility with SSH servers running on Windows

#### 4.2.0

* Fix a typo in README
* Add support for passing direct options to `ssh2.exec`

#### 4.1.0

* Add sftp `opts` support in `getFile`, `putFile`, `putFiles` and `putDirectory`

#### 4.0.1

* Fix support for `config.sock`

#### 4.0.0

* Fix a bug where `.getFile` parameters were reversed. Published as a major change because it is API breaking

#### 3.1.0

* Implement sftp-backed `mkdir`
* Implement `maxAtOnce` in `putFiles()`

#### 3.0.1

* Fix a bug for windows users where `.putDirectory()` wouldn't convert paths properly ( Thanks @lanxenet )

#### 3.0.0

Confidently, this is the most stable version of this module to date :tada:

* Rename `.end` to `.dispose`
* Rename `.get` to `.getFile`
* Rename `.put` to `.putFile`
* Rename `.putMulti` to `.putFiles`
* Add `.putDirectory` function to copy entire directories
* Change order of `.getFile` parameters
* Extended parameter validation in `.putFiles`
* Close SFTP connections after they are used
* Hide errors from `cd` when `cwd` is supplied but it does not exist
* Do not throw sync errors in async functions, return a rejected promise instead
* Propagate the private key read error if it's not ENOENT (ie. permissions issue)
* Changed the signature of input in `.putFiles` (ie. lowercase the props, from Local to local and from Remote to remote)

#### 2.0.7

* Escape `cwd` parameter
* Escape shell parameters

#### 2.0.6

* Fix more typos
* Fix `.get`'s promise never resolving

#### 2.0.5

* Fix some typos

#### 2.0.4

* Fix `stdin` support in `.exec` and `.execCommand`

#### 2.0.3

* Return `code` and `signal` in `.execCommand` if `stream` is set to `both` and in `.exec`

#### 2.0.2

* Fix a publishing issue

#### 2.0.1

* Fix method name in README
* Stricter validation of config

#### 2.0.0

* Rewrite from CoffeeScript to JS
* Rename `.exec` to `.execCommand`
* Accept config in `.connect` instead of constructor
* Add new `.exec` method that formats given parameters automatically
* Do not return file contents in `.get` because we already write it to a file

#### 1.0.0

* Initial release
