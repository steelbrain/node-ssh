var fs = require('fs');
var mock = require('mock-fs');
var test_server = require('./server/test_server');
var node_ssh = require('../Dist/SSH.js');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var should = chai.should();
chai.use(chaiAsPromised);


describe('node-ssh', function() {

  before(function() {
    // make fake filesystem
    mock({
      '/home': {
        'test_payload.txt': '/home/payload_destination.txt',
        'test_get_source': 'get test filecontents',
        'file1.txt': '/home/file_dest1.txt',
        'file2.txt': '/home/file_dest2.txt',
        'file3.txt': '/home/file_dest3.txt',
        'file4.txt': '/home/file_dest4.txt',
        'file5.txt': '/home/file_dest5.txt',
        'file6.txt': '/home/file_dest6.txt',
        'file7.txt': '/home/file_dest7.txt',
        'file8.txt': '/home/file_dest8.txt',
        'file9.txt': '/home/file_dest9.txt',
        'file10.txt': '/home/file_dest10.txt',
        'id_rsa': '-----BEGIN RSA PRIVATE KEY-----\nMIIJKQIBAAKCAgEAwCR2sTQuttKzp/u3AQLQo5fZ265ISkeUt46jrRXCsBvcWq6E\nPEQBeFvtKwSwEzrYoNvHy9kk3n0EnKsgEZZOC98Ivy17uU2A8lADXaOFacHzxOeT\n1pcyYenWIoHd10zRwCx1ThmIY7OHj1zllXyBtaqRYJl+m4TVz5uOZuf4/QahIshR\nfH58kYrlV7bvJvfPIxq+NW2TEuHZTEJY76apppcJ/BhAS2r6VO6PjJzigkQtTzYO\nU5sC12e16hESGTJcpDtFT2HH8qQwBR0skV3zws6Bm82ecBT6+DFU0sL5qLOqQ8nc\nKbvRqbVM75WPiSSaPHx1eRQQvdgBIikn5RJf7iWd33CNufJlds6aK2JYKFH5TzyH\nvdNPFP6/cYVW281C5s04SW40aluKLPOEyiSsL9z+EXVMx1Qb/aEtC8sdzqJ0Fy+S\nSMuVXmNan5OtYX4drsvE3ezEtST0mVzG0R0iR5Ktt7mD2AE5wNOyqO3duPdHWyr6\n7c7g98CoIJyJNBY/VD9KBTyW6FEirCidpl2DqL9kd0I9clpvIDYdK3Yq/JuZd0Fe\nd4MczX4pkhU3N6h8iTBBxVoZaTZ5eww4kVoJ89R0k4joUslH6pXQHVC1EQOJpLS4\nnC8z2cFnyoc7bALnRXJqCvQDU+6FlZTXA83F0TDHchrLqk5M/TPqeB3/3dECAwEA\nAQKCAgBM2IiL+MXSItTtk1Ou2NRfCWV9YefRpW1KOIcnu3NBAfOQZQnIHJ7F52Yk\ndVyCZF+tfhkbYz5GqZOFoT9TKV0PjGUwKN25z9CJmQyvj63VDVgUYVYUViY1WNNm\nu6/g4v1ksaM82CNfVLcb1FiR/9jUsmIwU1N6mZb10E4UxCQl9lfN1HYap2/kubtd\n6HEfka7LaG+4aJmQzLkesc5mEq75TKEWrRBR2XhDLaJF550D4oaIjqMONwnc4sKz\n2Z32a9j3aikfRYk1dwspkHB5tyy9td/KU2NRimKRjxFQteAp46luMTaXjmGdUUBy\n9csRW41AMbq98RN9Cf3yDqnBCSdKI2C16bbpg3oOnBf2b366swOWcwC5UlbMNSuS\nU7zSJQm7Ynf4+XydSOyfvAgPpm4hvq7bLp7vAivEQVo0xFJZDuWj0em5hoq/szPa\nYzutCtXgW+GSXvp1yxrFp6vstWNNMO5IvRM5GBNs+f3ZYANqBlANO96vrf49h7q+\nfgmsjR+BnH/YIkZfMrb5GTjHcahZH42XKWjNdD6TfBEFHAeAP3qYaKHY0Y8MNl6q\niMdvGYwbZ7WDb2AJGNIs3NYVbdhFXzRTePLz1xUkflj964Ei5+rifi0eC+XgzcZ3\nE9yhN0wCj517lbhWnRIUJqme6fNDfo4gUEkEEUfVY2y6oh7ZwQKCAQEA4FcYzMOc\nJ8StcIVTeKi2WOyctrxfZQv1+60bkriAFBwKE8bm2FjDfm/k9Z8hn7CPwqKf57b6\niG6KNorqd/kSIGYTeN3FjMrqeyDk/aCmUrkNqmzF+iAEyNhM3oU7CFQX1UrIZ/tW\n993eMM7Shl8qWMHbleAJNPf8oTXOkttpfeXzQpD4Kf+rzJfDXHcY2mPFcGFdQepB\nmUbNyed9uMNojsyMfLRbff7Nrbs0rIbBIm0I0FGbb505zRdYrtYsVvtrgfVGq6LQ\nF3NKmm6usg9DzQgUzBLdm0Yp4RnC0ugm1z9vRKUvdVs+IRVk1I1hSWBtNTsj4BD8\nblDH5LzS/gNI+QKCAQEA20IiQkTQy5lkZ9o8pOK/sMWUgNJFWUWgOnE52umzhOtv\nsdI9MXfYnuhxsKSap8tTj8dW+QKT1YZXDWThfjRhE+gcqaa3sN2N77YYPXGhVMG0\nvBnnwKrzo27A1QKEiXEIswJm8JthvZKR0inXz+KM2CU4hPEOVpjyKDltGB9a5KXE\nsATdgbapYPDMpbqVQ0pJw6kwupR2w11R3BWhvGIErBcZAyGLW8y2L/FW/10Ljo5E\nM+Znu1DxS633rHAnTi/G4mLVOhyH3GoVAQpoD7BqChQcP6eblTprK2PZy/vJkjwt\ndZqiF75cNUDoIIXmk7p0sg5QX8WV2vJJzraWBtyJmQKCAQB+CRCawW6yfPF/3Len\newlu7gehNjVV3KFmsrth85upMJOMxtscQsoZ950nTS6ju5sYmyrBEHCyQ4AM4oCV\nxG2lnBNmfRmmXr3bTQC5aQ7oPKTr0U5slp55g+OzxCAFLtFw+CGdIXybpp9Uxm1K\nJp7w3ICUNBiYFJZur38NzIz4uT6wcCer2MLZH44XHaXt082xtFGjXYtbJIcq3o4o\nRkgwqcRnryATqho9d4ZBQzewMpeYCbEMxMUbbvlYyGSCvZ+JlJYOiVrlQdVw66vj\nx2WtA9RDTnoH6SRQHZvxx5FCrpXBeBgwk4FVLuLF82PryGuyUzZ1hLV8+I9E97yG\nDqxpAoIBAQCn8oh7amrlCaI3SpuZUXaz2SRfaLFmKEcLfR9r6AdykUUFWJ02/y4W\nysYLIIq2bLCdOXwNUUQcEsMrp1JycXzK2sjZyrJ577uBGmKG7js9yQK/8rfqhQgK\n8BMVFtCe1s5rEDP5qYu8wkCgUxzUSBzKk/gvHNZ2zsDuvs4p5BqjebanfZKOgXRM\npSac68bZvFW0YizJPl+aVikWBBvXSN17VFX8Z/1vW+dR4fNZt9PaZm8nsh1TBjVO\nWvuUQnRZF4+oaTwbPy9yTm+4VFhRbDhNcAoTWDd8nzroCZwS+9LzCNVpeAEhXtcS\nk507DFYKYpBwszYtphObmmuew403xEZBAoIBAQCQOa8sWf1MXCy1sic0eIIlCepc\no1zXPJ2ei/SdKE7aMVknYJDz7wNh77GKWCYm8BujOKGMgdb87JDG88Z8pjAXRw4U\nd/6nIqkUwl4glgdM04U4WYR+ZmsIO2DWNc2N2EvtjqipHpVoe0SksR+M7UOciTOR\naNUusUQH3vzUMVSXSnJ6SYhA36N9bdQbNOXOCWjAeZbqeYsH88IqgiC/gVlexkkO\nolHcNi7Ex7sDeHwKYkUQ88RTf+3xJzo6MQ2Q/IOLNvFa3TeUY0iY3QmC7wzEVJMo\neIerAMXn/ZGMV/jqcGvvrqwVIY42IsEGZ0KlOaDA/v8pPyXqDIpOrN7jDZju\n-----END RSA PRIVATE KEY-----',
      },
    });
    var server = test_server.startServer();
  });




  it('should send and receive commands', function(done) {
    var ssh = new node_ssh.default();

    ssh.connect({
      host: 'localhost',
      port: 2222,
      username: 'foo',
      password: 'bar'
    })

    .then(function() {
      command = 'test_command';
      return ssh.execCommand(command, {stream: 'both'});
    })

    .should.eventually.deep.equal({
      stdout: 'test_command',
      stderr: 'test_command',
      code: 0,
      signal: undefined
    }).notify(done)

    .then(function() {
      return ssh.end();
    })

    .catch(function(err) {
      console.error("error!", err.stack)
    });

  });


  it('should send a file', function(done) {
    var ssh = new node_ssh.default();

    ssh.connect({
      host: 'localhost',
      port: 2222,
      username: 'foo',
      password: 'bar'
    })

    .then(function() {
      return ssh.put('/home/test_payload.txt', '/home/payload_destination.txt');
    })

    // read then file that should've been putten
    .then(function() {
      return new Promise( function(resolve) {
        fs.readFile('/home/payload_destination.txt', function read(err, data) {
          if (err) {
              throw err;
          }
          resolve(data.toString())
        });
      });
    })

    .should.eventually.equal('/home/payload_destination.txt').notify(done)

    .then(function() {
      return ssh.end();
    })

    .catch(function(err) {
      console.error("error!", err.stack)
    });

  });






  it('should get a file', function(done) {
    var ssh = new node_ssh.default();

    ssh.connect({
      host: 'localhost',
      port: 2222,
      username: 'foo',
      password: 'bar'
    })

    .then(function() {
      return ssh.get('/home/test_get_destination.txt', '/home/test_get_source.txt');
    })

    // read then file that should've been gotten
    .then(function() {
      return new Promise( function(resolve) {
        fs.readFile('/home/test_get_destination.txt', function read(err, data) {
          if (err) {
              throw err;
          }
          resolve(data.toString())
        });
      });
    })

    // the mock server actually just puts the filename into the file
    .should.eventually.equal('/home/test_get_source.txt').notify(done)

    .then(function() {
      return ssh.end();
    })

    .catch(function(err) {
      console.error("error!", err.stack)
    });

  });






  it('should send many files asyncronously', function(done) {
    var ssh = new node_ssh.default();

    ssh.connect({
      host: 'localhost',
      port: 2222,
      username: 'foo',
      password: 'bar'
    })

    .then(function() {
      return ssh.putMulti([{'Local': '/home/file1.txt', 'Remote': '/home/file_dest1.txt'},
                    {'Local': '/home/file2.txt', 'Remote': '/home/file_dest2.txt'},
                    {'Local': '/home/file3.txt', 'Remote': '/home/file_dest3.txt'},
                    {'Local': '/home/file4.txt', 'Remote': '/home/file_dest4.txt'},
                    {'Local': '/home/file5.txt', 'Remote': '/home/file_dest5.txt'}])
    })

    // read then file that should've been gotten
    .then(function() {
      return Promise.all( [
         (new Promise( function(resolve) {fs.readFile('/home/file_dest1.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest1.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest2.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest2.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest3.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest3.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest4.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest4.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest5.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest5.txt')
       ]);
    })

    .then(function() {
      return ssh.end();
    })


    .should.notify(done);

    //
    // .catch(function(err) {
    //   console.error("error!", err.stack)
    // })
    //
    // .should.notify(done);

  });






  it("should send LOTS of files, one at a time to stay under the server's connection limit", function(done) {
    this.timeout(5000);
    var ssh = new node_ssh.default();

    ssh.connect({
      host: 'localhost',
      port: 2222,
      username: 'foo',
      password: 'bar'
    })


    // Write Solvers
    .then(function() {

      put_files = [{'Local': '/home/file1.txt', 'Remote': '/home/file_dest1.txt'},
                    {'Local': '/home/file2.txt', 'Remote': '/home/file_dest2.txt'},
                    {'Local': '/home/file3.txt', 'Remote': '/home/file_dest3.txt'},
                    {'Local': '/home/file4.txt', 'Remote': '/home/file_dest4.txt'},
                    {'Local': '/home/file5.txt', 'Remote': '/home/file_dest5.txt'},
                    {'Local': '/home/file6.txt', 'Remote': '/home/file_dest6.txt'},
                    {'Local': '/home/file7.txt', 'Remote': '/home/file_dest7.txt'},
                    {'Local': '/home/file8.txt', 'Remote': '/home/file_dest8.txt'},
                    {'Local': '/home/file9.txt', 'Remote': '/home/file_dest9.txt'},
                    {'Local': '/home/file10.txt', 'Remote': '/home/file_dest10.txt'},]

      return put_files.reduce( function(p, file) {
        return p.then(function(){return ssh.put(file.Local, file.Remote); });
       }, Promise.resolve());
    })

    // read then file that should've been gotten
    .then(function() {
      return Promise.all( [
         (new Promise( function(resolve) {fs.readFile('/home/file_dest1.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest1.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest2.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest2.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest3.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest3.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest4.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest4.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest5.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest5.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest6.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest6.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest7.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest7.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest8.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest8.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest9.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest9.txt'),
         (new Promise( function(resolve) {fs.readFile('/home/file_dest10.txt', function read(err, data) {if (err) throw err; resolve(data.toString())});})).should.eventually.become('/home/file_dest10.txt')
       ]);
    })

    .then(function() {
      return ssh.end();
    })

    .should.notify(done);

  });

});
