#### 13.2.1

- Maintenance release with updated homepage in manifest

#### 13.2.0

- Add `noTrim` option to exec methods. #475 (Thanks @kimbob13)

#### 13.1.0

- Add new methods around sockets forwarding. #460 (Thanks @mat-sz)

#### 13.0.1

- Fix trailing space in `.exec()` generated command when no parameters are used. #455 (Thanks @Nicram97)

#### 13.0.0

- BREAKING: `privateKey` config parameter no longer accepts file system paths. Please use the new `privateKeyPath` parameter instead

#### 12.0.5

- Fixed manifest config for Typescript typings. #431 (Thanks @Sikarii)

#### 12.0.4

- Potential fix for unhandled error events

#### 12.0.3

- Fix handling of error events in `requestShell`, `requestSFTP` and `execCommand`. #417 (Thanks @jackpap)

#### 12.0.2

- Bump min semver version of `ssh2` to `v1.5.0`

#### 12.0.1

- Fix exit code handling (Thanks @maquak)

#### 12.0.0

- Upgrade `ssh2` to `v1.1.0`
- Upgrade all dev dependencies
- Minimum required version of Node.js is now v10
- Add support for Readable stream in `options.stdin` in `exec`

#### 11.1.1

- Minor doc fixup. #340 (Thanks @smali-kazmi)
- Automatically close stdin for executed programs even when no stdin is provided. #341 (Thanks @wmertens)

#### 11.1.0

- Add support for `options` in `withShell` and `requestShell`

#### 11.0.0

* Add ESM module exports for upcoming Node.js versions
* BREAKING: Changed export to named, so it becomes `const {NodeSSH} = require('node-ssh')` and `import {NodeSSH} from 'node-ssh'`
* Export Typescript types from package
* Set default concurrency to `1` to ensure compatibility with wider array of servers

#### 10.0.2

* Prefer arrow callbacks - Fixes #304 (Thanks @ururk)

#### 10.0.1

* Fix unixification of paths in more places (Thanks @mbr4477)

#### 10.0.0

* Unixy all paths before passing onwards
* Add `isConnected` method

#### 9.0.0

* Add support for Putty private key files
* Add `getDirectory` method
* Add `onChannel` support to `execCommand`
* Rename `options.options` in `execCommand` to be `options.execOptions`
* Rename `options.sftpOptions` to `options.transferOptions` in `putFiles`
* Add `withSFTP` and `withShell` methods
* Connection timed out error is now an instance of `SSHError`
* Invalid argument errors are now `AssertionError` instances
* `onKeyboardInteractive` default will only be set if a `config.password` is provided

#### 8.0.0

* Stop swallowing non-existent cwd errors in `execCommand` #272 (Thanks @dadamssg)

#### 7.0.1

* Do not include privateKey path in error message

#### 7.0.0

* Potential breaking upgrade to `ssh2` dependency

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

#### 4.2.3

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
