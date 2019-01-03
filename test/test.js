var test = require('tape')
var Jaxire = require('../Jaxire')

test('Any static method creates an instance', (t) => {
  var POST = Jaxire.post('/')
  t.ok(POST instanceof Jaxire, 'should be instance of Jaxire')
  t.end()
})

test('"Preset" method creates a new constructor with predefined properties for all its instances', (t) => {
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

test('Provides the "send" method that also provides different formats to send data', (t) => {
  var req = Jaxire.get('/')
  t.ok(typeof req.send === 'function', 'schould be a function')
  t.ok(req.send.text, 'should provide a method to send objects as url string')
  t.ok(req.send.json, 'should provide a method to send JSON data')
  t.ok(req.send.form, 'should provide a method to send form data')
  t.end()
})

