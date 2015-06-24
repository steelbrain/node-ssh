# @Compiler-Output "../Dist/ExceptedWrite.js"

EventEmitter = require('events').EventEmitter
Promise = require('a-promise')
Buffer = require('buffer').Buffer

class ExpectedWrite extends EventEmitter
  constructor: (@stream) ->
    super
    @status = true
    @expected = null
    @callback = null
    @data = stdout: '', stderr: ''

    @stream.on 'close', =>
      @emit('end')
    if @stream.stdout
      @stream.stdout.on 'data', (data) =>
        @data.stdout += data
    else
      @stream.on 'data', (data) =>
        @data.stdout += data
    @stream.stderr.on 'data', (data) =>
      @data.stderr += data

  onEnd: ->
    return new Promise (Resolve)=>
      if @status
        @once('end', Resolve)
      else
        Resolve()

module.exports = ExpectedWrite