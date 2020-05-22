var test = require('tape')
var sinon = require('sinon')
var Jaxire = require('../Jaxire')

test('Any static method creates an instance', function (t) {
  var POST = Jaxire.post('/')
  t.ok(POST instanceof Jaxire, 'should be instance of Jaxire')
  t.end()
})

test('"Preset" method creates a new constructor with predefined properties for all its instances', function (t) {
  var statusesMap = {
    'passed': 200
  }
  var callbacksMap = {
      'passed': () => {
    }
  }
  var sendFunc = (data) => { console.log(data); return data }
  var CustomConstructor = Jaxire.preset({
    headers: {
      'CustomHeader': 'HeaderValue'
    },
    status: statusesMap,
    on: callbacksMap,
    send: sendFunc
  })
  var instance = CustomConstructor.get('/')
  t.ok(instance instanceof CustomConstructor, 'should be instance of custom constructor')
  t.deepEqual(instance._statusesMap, statusesMap, 'should set statuses')
  t.deepEqual(instance._callbacksMap, callbacksMap, 'should set callbacks')
  
  t.end()
})

test('Provides the "send" method that also provides different formats to send data', function (t) {
  var req = Jaxire.get('/')
  t.ok(typeof req.send === 'function', 'schould be a function')
  t.ok(req.send.text, 'should provide a method to send objects as url string')
  t.ok(req.send.json, 'should provide a method to send JSON data')
  t.ok(req.send.form, 'should provide a method to send form data')
  t.end()
})

test('Sets "Content-Type" header according send method', function (t) {
  var base = Jaxire.preset({
    send: function (val) {      
      return val
    }
  })
  var send = base.get('/')
  var sendText = base.post('/')
  var sendJson = base.post('/')
  var sendForm = base.post('/')
  send.send()
  sendText.send.text({ text: 'sample' })
  sendJson.send.json({ data: 'sample' })
  sendForm.send.form()

  t.equal(send._headersMap['Content-Type'], undefined, 'should not set content type when there is no data to send')
  t.equal(sendText._headersMap['Content-Type'], 'application/x-www-form-urlencoded', 'should set header for .text()')
  t.equal(sendJson._headersMap['Content-Type'], 'application/json', 'should set header for .json()')
  t.equal(sendForm._headersMap['Content-Type'], undefined, 'should not set header for .form()')
  t.end()
})

test('Calls preset data modifier on each send method', function (t) {
  var spy = sinon.spy()
  var preset = Jaxire.preset({
    send: spy
  })

  preset.post('/').send(0, true).finally(function () {
    t.equal(spy.firstCall.args[0], 0, 'called on "send"')
  })
  preset.post('/').send.text({ step: 1 }).finally(function () {
    t.equal(spy.secondCall.args[0].step, 1, 'called on "send.text"')
  })
  preset.post('/').send.json({ step: 2 }).finally(function () {
    t.equal(spy.thirdCall.args[0].step, 2, 'called on "send.json"')
  })
  preset.post('/').send.form({ step: 3 }).finally(function () {
    t.equal(spy.lastCall.args[0].step, 3, 'called on "send.form"')
  })

 t.plan(4)
})

test('Saves previous preset data', function (t) {
  var anyWayCallback = sinon.spy()
  var statusMap = {
    anyway: 'all'
  }
  var callbackMap = {
    anyway: anyWayCallback
  }
  var Parent = Jaxire.preset({
    headers: {
      parent: 'parent'
    },
    status: statusMap,
    on: {
      anyway: anyWayCallback
    }
  })
  var Child = Parent.preset({
    headers: {
      child: 'child'
    }
  })
  
  var ParentInstance = Parent.get('/')
  var ChildInstance = Child.get('/')

  t.deepEqual(
    ParentInstance._headersMap,
    { parent: 'parent' },
    'parent should contain custom header'
  )

  t.deepEqual(
    ChildInstance._headersMap,
    { parent: 'parent', child: 'child' },
    'child should contain own custom header and it\'s parent custom header'
  )
  t.end()
})

test('Merges "prepare" functions according merge strategy', function (t) {
  var parentStubFirst = sinon.stub().resolves()
  var parentStubLast = sinon.stub().resolves()
  var childStubFirst = sinon.stub().resolves()
  var childStubLast = sinon.stub().resolves()

  var ParentFirst = Jaxire.preset({
    prepare: function (done) {
      parentStubFirst().then(done)
    }
  })
  var ChildLast = ParentFirst.preset({
    prepare: function (done) {
      if (parentStubFirst.called) {
        childStubLast()
          .then(function () {
            t.pass('"post" strategy has been checked')
            done()
          })
      } else {
        t.fail('Child constructor should call "prepare" after parent \
                constructor\'s one has been called')
      }
    },
    prepareMergeStrategy: 'post'
  })

  var ParentLast = Jaxire.preset({
    prepare: function (done) {
      if (childStubFirst.called) {
        t.pass('"pre" strategy has been checked')
        done()
      } else {
        t.fail('Child constructor should call "prepare" before parent \
                constructor\'s one has been called')
      }
    }
  })
  var ChildFirst = ParentLast.preset({
    prepare: function (done) {
      childStubFirst().then(done)
    },
    prepareMergeStrategy: 'pre'
  })

  t.plan(2)
  ChildLast.get('/').send()
  ChildFirst.get('/').send()
})

test('Merges "send" functions according merge strategy', function (t) {
  var initialValue = 0
  var ParentFirst = Jaxire.preset({
    send: function (value) {
      if (value === initialValue) {
        t.pass('parent value has not been modified')
      } else {
        t.fail('The parent\'s "send" function should get a value that equals \
                initialValue in case of "post" strategy')
      }
      return value + 1
    }
  })
  var ChildLast = ParentFirst.preset({
    send: function (value) {
      if (value === initialValue + 1) {
        t.pass('"post" strategy has been checked')
      } else {
        t.fail('The child\'s "send" function should get a modified value \
                in case of "post" strategy')
      }
      return value
    },
    sendMergeStrategy: 'post'
  })

  var ParentLast = Jaxire.preset({
    send: function (value) {
      if (value === initialValue + 2) {
        t.pass('"pre" strategy has been checked')
      } else {
        t.fail('The parent\'s "send" function should get a modified value \
                in case of "pre" strategy')
      }
      return value
    }
  })
  var ChildFirst = ParentLast.preset({
    send: function (value) {
      if (value === initialValue) {
        t.pass('child value has not been modified')
      } else {
        t.fail('The child\'s "send" function should get a value that equals \
                initialValue in case of "pre" strategy')
      }
      return value + 2
    },
    sendMergeStrategy: 'pre'
  })

  t.plan(4)
  ChildLast.get('/').send(initialValue)
  ChildFirst.get('/').send(initialValue)
})

test('Uses the same context in "send" and "prepare" preset functions', function (t) {
  var contextSpy = sinon.stub().resolves()

  var Parent = Jaxire.preset({
    prepare: function (done) {
      contextSpy(this)
        .then(done)
    },
    send: function (value) {
      contextSpy(this)
      return value
    }
  })
  var Child = Parent.preset({
    prepare: function (done) {
      contextSpy(this)
        .then(done)
    },
    send: function (value) {
      contextSpy(this)
      if (contextSpy.alwaysCalledWithExactly(this)) {
        t.pass('Contexts are equal')
      } else {
        t.fail('Contexts are not equal')
      }
      return value
    },
    sendMergeStrategy: 'post',
    prepareMergeStrategy: 'post'
  })

  ChildInstance = Child.get('/')

  t.plan(1)

  ChildInstance.send()
})
