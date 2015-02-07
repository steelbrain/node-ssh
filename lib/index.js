module.exports = (function(){
  var fs      = require('fs');
  var driver  = require('ssh2');
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
      return new Promise(function(resolve,reject){
        try {
          this.conn.on('error',reject);
          this.conn.on('ready',function(){
            this.status = true;
            resolve();
          }.bind(this));
          this.conn.connect(this.config);
        } catch(Error){
          reject(Error);
        }
      }.bind(this));
    }
    mkdir(path){
      return this.exec('mkdir -p '+path);
    }
    exec(command,opts){
      opts = opts || {};
      return new Promise(function(resolve,reject){
        if(!this.status)
          return reject("Not yet connected to server");
        if(opts.cwd)
          command = `cd ${opts.cwd}; ${command}`;
        this.conn.exec(command,function(error,stream){
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
      }.bind(this));
    }
    put(localFile,remoteFile){
      return new Promise(function(resolve,reject){
        if(!fs.existsSync(localFile))
          return reject("Local File doesn't exist");
        this.conn.sftp(function(error,sftp){
          if(error)
            return reject(error);
          sftp.fastPut(localFile,remoteFile,function(error){
            if(!error)
              return resolve();
            if (error.message === 'No such file'){
              this.mkdir(remoteFile.split("/").slice(0,-1).join('/')).then(function(){
                this.put(localFile,remoteFile).then(resolve);
              });
            } else {
              reject(error);
            }
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }
    get(remoteFile,localFile){
      return new Promise(function(resolve,reject){
        this.conn.sftp(function(error,sftp){
          if(error)
            return reject(error);
          var
            Contents = [],
            Stream = sftp.createReadStream(remoteFile);
          Stream.on('data',function(Data){
            Contents.push(Data.toString());
          });
          Stream.on('error',function(error){
            reject(error);
          });
          Stream.on('close',function(){
            Contents = Contents.join('');
            if(!localFile)
              return resolve(Contents);
            fs.writeFile(localFile,Contents,function(error){
              if(error)
                reject(error);
              else
                resolve(Contents);
            });
          });
        }.bind(this));
      }.bind(this));
    }
  }
  return SSH;
})();
