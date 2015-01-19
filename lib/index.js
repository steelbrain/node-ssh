module.exports = (function(){
  var driver  = require('ssh2');
  var fs      = require('fs');
  var Promise = require('a-promise');
  class SSH{
    config:Object;
    conn:Connection;
    status:boolean;
    constructor(config){
      var errors = [];
      if(typeof config.username === 'undefined')
        errors.push(new Error("You must specify a valid username"));
      if(typeof config.host === 'undefined')
        errors.push(new Error("You must specify a valid host"));
      if(typeof config.privateKey === 'undefined')
        errors.push(new Error("You must specify path to a privateKey"));
      else if(!fs.existsSync(config.privateKey))
        errors.push(new Error("The privateKey specified doesn't exist"));
      else if(!fs.lstatSync(config.privateKey).isFile())
        errors.push(new Error("The privateKey specified isn't page"));
      if(errors.length > 0)
        throw errors;
      config.privateKey = fs.readFileSync(config.privateKey);
      config.port = config.port || 22;
      this.config = config;
      this.status = false;
      try {
        this.conn = new driver();
      } catch(Error){
        throw [Error]; // We throw error arrays from the constructor
      }
    }
    connect(){
      var self = this;
      return new Promise(function(resolve,reject){
        try {
          self.conn.on('error',reject);
          self.conn.on('ready',function(){
            self.status = true;
            resolve();
          });
          self.conn.connect(self.config);
        } catch(Error){
          reject(Error);
        }
      });
    }
    exec(command,opts){
      var self = this;
      opts = opts || {};
      return new Promise(function(resolve,reject){
        if(!self.status)
          return reject("Not yet connected to server");
        if(opts.cwd)
          command = `cd ${opts.cwd}; ${command}`;
        self.conn.exec(command,function(error,stream){
          if(error)
            return reject(error);
          var toReturn = {stdout:'',stderr:''};
          stream.on('close',function(){
            toReturn.stdout = toReturn.stdout.toString();
            toReturn.stderr = toReturn.stderr.toString();
            resolve(toReturn);
          }).on('data',function(data){
            toReturn.stdout = data
          }).stderr.on('data',function(data){
              toReturn.stderr = data
          });
        });
      });
    }
    put(localFile,remoteFile){
      var self = this;
      return new Promise(function(resolve,reject){
        if(!fs.existsSync(localFile))
          return reject("Local File doesn't exist");
        self.conn.sftp(function(error,sftp){
          if(error)
            return reject(error);
          sftp.fastPut(localFile,remoteFile,{},function(error){
            if(!error)
              return resolve();
            if (error.message === 'No such file'){
              self.mkdir(remoteFile.split("/").slice(0,-1).join('/')).then(function(){
                self.put(localFile,remoteFile);
              });
            } else {
              reject(error);
            }
          });
        });
      });
    }
    mkdir(path){
      return this.exec('mkdir -p '+path);
    }
  }
  return SSH;
})();
