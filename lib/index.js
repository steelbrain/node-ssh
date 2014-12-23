var Promise, SSH, driver, fs;

driver = require('ssh2');

fs = require('fs');

Promise = require('bluebird');

SSH = (function() {
  function SSH(config) {
    var err, errors;
    errors = [];
    if (typeof config.port === 'undefined') {
      config.port = 22;
    }
    if (typeof config.username === 'undefined') {
      errors.push(new Error("You must specify a valid username"));
    }
    if (typeof config.host === 'undefined') {
      errors.push(new Error("You must specify a valid hostname"));
    }
    if (typeof config.privateKey === 'undefined') {
      errors.push(new Error("You must specify path to a privateKey"));
    } else if (!fs.existsSync(config.privateKey)) {
      errors.push(new Error("The privateKey specified doesn't exist"));
    } else if (!fs.lstatSync(config.privateKey).isFile()) {
      errors.push(new Error("The privateKey specified isn't a file"));
    }
    if (errors.length > 0) {
      throw errors;
    }
    config.privateKey = fs.readFileSync(config.privateKey);
    this.config = config;
    this.status = 0;
    try {
      this.conn = new driver();
    } catch (_error) {
      err = _error;
      throw [err];
    }
  }

  SSH.prototype.connect = function() {
    var me;
    me = this;
    return new Promise(function(resolve, reject) {
      var error;
      try {
        me.conn.on('error', reject);
        me.conn.on('ready', function() {
          me.status = 1;
          resolve();
        });
        me.conn.connect(me.config);
      } catch (_error) {
        error = _error;
        reject(error);
      }
    });
  };

  SSH.prototype.exec = function(command) {
    var me;
    me = this;
    return new Promise(function(resolve, reject) {
      if (me.status === 0) {
        reject("Not yet connected to server");
        return;
      }
      me.conn.exec(command, function(error, stream) {
        var toReturn;
        if (error) {
          reject(error);
          return;
        }
        toReturn = {
          stdout: '',
          stderr: ''
        };
        return stream.on('close', function() {
          toReturn.stdout = toReturn.stdout.toString();
          toReturn.stderr = toReturn.stderr.toString();
          resolve(toReturn);
        }).on('data', function(data) {
          toReturn.stdout = data;
        }).stderr.on('data', function(data) {
            toReturn.stderr = data;
          });
      });
    });
  };

  SSH.prototype.put = function(localFile, remoteFile) {
    var me;
    me = this;
    return new Promise(function(resolve, reject) {
      if (!fs.existsSync(localFile)) {
        reject("Local File doesn't exists");
        return;
      }
      me.conn.sftp(function(error, sftp) {
        if (error) {
          reject(error);
          return;
        }
        sftp.fastPut(localFile, remoteFile, {}, function(error) {
          var remoteDir;
          if (typeof error !== 'undefined') {
            if (error.message === 'No such file') {
              remoteDir = remoteFile.split("/").slice(0, -1).join('/');
              me.mkdirRecursive(remoteDir).then(function() {
                me.put(localFile, remoteFile).then(resolve, reject);
              });
            } else {
              reject(error);
            }
          } else {
            resolve();
          }
        });
      });
    });
  };

  SSH.prototype.mkdirRecursive = function(path) {
    var me;
    me = this;
    console.log(path);
    return new Promise(function(resolve, reject) {
      me.conn.sftp(function(error, sftp) {
        if (error) {
          reject(error);
          return;
        }
        sftp.lstat(path, function(info) {
          if (info instanceof Error && info.message === 'No such file') {
            console.log("Gonna create a directory");
            me.mkdir(path).then(function() {
              resolve();
            }, function() {
              var dePath;
              dePath = path.split('/').slice(0, -1).join('/');
              me.mkdirRecursive(dePath).then(function() {
                me.mkdirRecursive(path).then(resolve, reject);
              }, reject);
            });
          }
        });
      });
    });
  };

  SSH.prototype.mkdir = function(path) {
    var me;
    me = this;
    return new Promise(function(resolve, reject) {
      me.conn.sftp(function(error, sftp) {
        if (error) {
          reject(error);
          return;
        }
        sftp.mkdir(path, function(error) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });
  };

  return SSH;

})();

module.exports = SSH;

