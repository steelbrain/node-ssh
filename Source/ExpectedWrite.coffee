# @Compiler-Output "../Dist/ExceptedWrite.js"

EventEmitter = require('events').EventEmitter
Promise = require('a-promise')
Buffer = require('buffer').Buffer

class ExpectedWrite extends EventEmitter
  constructor: (@stream) ->
    super
    @status = true
    @expected = null
    @expectedStream = 'both' # enum{ stdout, stderr, both }
    @callback = null
    @data = stdout: '', stderr: ''

    @stream.on 'close', =>
      @emit('end', @data)
    if @stream.stdout
      @stream.stdout.on 'data', (data) =>
        @data.stdout += data
        @validateExpected()
    else
      @stream.on 'data', (data) =>
        @data.stdout += data
        @validateExpected()
    @stream.stderr.on 'data', (data) =>
      @data.stderr += data
      @validateExpected()

  # Internal
  validateExpected: ->
    return unless @expected
    return unless @callback
    valid = false
    if @expectedStream isnt 'stderr'
      if @data.stdout.indexOf(@expected) isnt -1 then valid = 'stdout'
    if @expectedStream isnt 'stdout' and not valid
      if @data.stderr.indexOf(@expected) isnt -1 then valid = 'stderr'
    return unless valid
    content = @data[valid]
    callback = @callback
    @data = stdout: '', stderr: ''
    @callback = null
    @expected = null
    @expectedStream = 'both'
    callback({Content: content, E: @})

  expect: (toExpect) ->
    return new Promise (Resolve) =>
      @expected = toExpect
      @callback = Resolve
      @validateExpected()

  write: (Content)->
    if @stream.stdin
      @stream.stdin.write Content
    else
      @stream.write Content

  end: ->
    if @stream.kill
      @stream.kill()
    else
      @stream.close()
    @onEnd()

  onEnd: ->
    return new Promise (Resolve) =>
      if @status
        @once('end', Resolve)
      else
        Resolve(@data)

module.exports = ExpectedWrite
