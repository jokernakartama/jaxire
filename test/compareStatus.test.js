var test = require('tape')
var sinon = require('sinon')
var compareStatus = require('../helpers/compareStatus')


test('Pass "all" status anyway', function (t) {
  var statusCode = Math.round(Math.random() * 1000)
  t.ok(compareStatus('all', statusCode), 'should pass any status')
  t.end()
})

test('Pass "nXX"-like statuses', function (t) {
  var statusCode = Math.round(Math.random() * 1000)
  t.ok(compareStatus('5xx', 500), '500 status code should pass 5xx status')
  t.notOk(compareStatus('4xx', 302), '302 status code should not pass 4xx status')
  t.ok(compareStatus('42x', 429), '429 status code should pass 42x status')
  t.notOk(compareStatus('42x', 431), '431 status code should not pass 42x status')
  t.end()
})
