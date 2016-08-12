var node_ssh = require('../Dist/SSH.js');
var test_server = require('./fixtures/test_server.js')
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var should = chai.should();
chai.use(chaiAsPromised);



describe('Calculator', function() {
  it('should add numbers correctly', function() {
    expect(3+4).to.equal(7);
  });
});

describe('execCommand()', function() {

  before(function() {
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
      console.log("connected..");
      command = 'test_command';
      return ssh.execCommand(command, {stream: 'both'});
    })

    .then(function(results) {
      console.log("results! ", results);
      return Promise.resolve(results);
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

});
