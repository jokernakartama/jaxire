var test = require('tape')
var getQueryString = require('../helpers/getQueryString')

test('Converts params to query', function (t) {
  var arr = [false, 2, 'string from array']
  var bool = true
  var string = 'somevalue'
  var number = 86

  t.equal(
    getQueryString({
      bool: bool,
      'arr[]': arr,
      string: string,
      number: number
    }),
    'bool=true&arr[]=false&arr[]=2&arr[]=string%20from%20array&string=somevalue&number=86',
    'Array is converted to string properly'
  )
  t.end()
})
