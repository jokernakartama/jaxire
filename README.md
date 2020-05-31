# jaxire

A small wrapper over [xhr](https://www.npmjs.com/package/xhr) to write easy-to-read requests for REST api services.

## Why

I needed an ajax library that can help me to write api requests self-documented way. It keeps your status-code-based callbacks pretty clear. Inspired of Django requests style and Chai assertion library chains.

## Installation

```

npm install jaxire

```

## Basic usage

Any Jaxire method creates a new instance at the first time, others just change its properties. It is required to set the method and the url, and to call .send() after all configurations.

```js

// I just use two letters as use two spaces for identation
var JX = require('jaxire')

JX.get('/posts', { limit: 10, page: 2 })
  .headers({
    'Accept-Language': 'en-US'
  })
  .status({
    success: 200,
    error: '!200',
    anyway: 'all'
  })
  .on('success', (body, resp) => {
    // do something
  })
  .on('error', (body, resp) => {
    // throw an error
  })
  .on('anyway', (body, resp) => {
    //do something in any case, e. g. remove "loading" spinner
  })
  .send()

```

## API

### Instance properties

#### .url

An url set by `.[method](url)`

#### .method
A method (GET, POST, PUT, DELETE, PATCH) set by `.[method]()`

#### .format

A format set by `.send[format]()` method. Default is null.

#### .message

A message set by `.descr()`

### Instance/constructor methods

Calling a constructor method the first time returns it's instance.

#### .[method](url, urlParams)

Sets the request method by calling `.get()`, `.post()`, `.delete()`, `.patch()` or `.put()` and url. Note that urlParams should be a map of values. The values will be converted by `.toString` method. Arrays and sets will be converted to multiple query parameters with the same name (and their elements will be converted by `.toString` regardless of the element type). Here is an example:


```js

// GET /posts
//   ?limit=10
//   &page=2
//   &sort_by=name
//   &roles[]=1
//   &roles[]=2
//   &branches=[Object%20Array]
//   &branches=[Object%20Object]
//   &tree=[Object%20Object]
//   &check=true
JX.get('/posts', {
  limit: 10,
  page: 2,
  sort_by: 'name'
  'roles[]': new Set([1, 2]),
  branches: [
    [0, 0, 0],
    { a: 'a', b: 'b' }
  ],
  tree: { here: true, there: false }
  check: true
})

```

#### .status(statuses)

Sets groups of status codes for callbacks. You can use arrays for multiple statuses, strings started with "!" to exclude and a keyword "all" to include any status code. Also you can use "5xx"-like status (actually, you can replace any number with "x").

```js

JX.status({
  ok: [200, 201],
  error: ['!201', '!200', '!500'],
  somethingGoesTotallyWrong: 500,
  thoseClientErrors: '4xx',
  atLeastItHasTheResponse: 'all'
})

```

#### .on(statusGroup, callback)

Each call adds a callback to a status group (or change the existing one). The callback function passes two arguments: the response body (JSON parsed, if it is possible) and the response itself, read [xhr documentation](https://www.npmjs.com/package/xhr#var-req--xhroptions-callback) for more info.

```js

JX
  ...
  // do not forget to set status groups in that chain
  .on('ok', (body) => { console.log(body) })
  .on('error', (body, resp) => { console.warn('Status code is ' + resp.statusCode) })
  

```

#### .descr(any)

Just sets a description for the request, that can be used in callbacks and (what is more useful) in presets. A short message helps you describe what is happening there, better than the request url and method, especially when the url contains dynamic parameters. The passed parameter is available as *this.message* in callbacks and preset functions.

```js
var id = getUserId() // dynamic parameter
var messageMap = {
  get_user: 'Obtained user info'
}

// It is already clear what is happening, isn't it?
JX.descr('get_user')

  .get('/user' + id)
  ...
  .on('anyway', () => {
    // make it more clear after a request!
    console.log(messageMap[this.message])
  })
  ...

```

#### .send(data) => Promise

Sends the data. Also provides to set content type and format data by calling its own methods: `.send.json()`, `.send.text()`, `.send.form()`. You do not need to set `Content-Type` header manually if you use one of them!

```js

JX
  ...
  // configured before
  // I use just send() with no arguments when they are not required
  .send()
  // Serializable data can be sent as JSON
  // .send.json({ key: 'value', list: [1, 2, 3]})

  // URIEncoded string, uses .toString() to serialize values!
  // sends name=John&lastname=Doe&visible=false&roles[]=1&roles[]=2
  // .send.text({ name: 'John', lastname: 'Doe', visible: false, 'roles[]': [1, 2] })

  // FormData object (this is the same method as .send unlike two others
  // before, but can be helpful to explicitly declare that the request
  // is used to send forms)
  // .send.form(new FormData())

```

The method `.send()` will send a request so it should be last method you call and it is required if you want to send the request!

The returned promise resolves xhr response object:

```js
{
  body: Object||String,
  statusCode: Number,
  method: String,
  headers: {},
  url: String,
  rawRequest: xhr
}
```

#### .abort(callback)

Aborts the request (even if it's not started yet, for example during **.prepare**). This method can be only called on Jaxire instance. It calls the provided callback function with aborted `XMLHttpRequest` object (or `null`, if the request has not been created).
Returns the same Jaxire instance, so you can continue to call its methods.

```js
// It makes sense to save Jaxire instance in a variable
const rabbit = Jaxire.get('/rabbit').status({ success: 200 })
const turtle = Jaxire.get('/turtle').status({ success: 200 })

// Abort the latter in case when the former is completed
rabbit.on('success', () => {
  turtle
    .abort((request) => {
      console.log('The following request: ', request, ' has been aborted')
    })
    // and optionally we can continue to use the object
    .get('/mighty-turtle')
    .send()
})

rabbit.send()
turtle.send()

if (environment === 'sea') {
  // Just stop the first request immediately
  rabbit.abort()
}
```



## Presets

Sometimes you need to permanently set some parameters for all requests. Jaxire provides a special method `.preset(config)` to create preconfigured Jaxire-like constructors. The options is similar to Jaxire methods.

### Preset options

* **headers** - an object of headers that be preset in each instance of the constructor
* **status** - an object of statuses
* **on** - an object of callbacks (unlike an instance method)
* **prepare - fn(done)** - a function that be called before sending request. Passes one argumnent: a function that should be called if you need to continue and send request. Should be useful to *make asynchronuos actions* before sending or to stop the request conditionally.
* **send - fn(value, params)** - a function that can modify sent data before it will be sent. The second argument is any data that you pass to the *prepare*'s "done".
* **sendMergeStrategy** - `'post'` or `'pre'`: is how to call parent preset send functions. If you want to replace one, just ommit this parameter.
* **prepareMergeStrategy** -`'post'` or `'pre'`: is how to wait parent preset prepare functions. If you want to replace one, just ommit this parameter.

Both **prepare** and **send** functions use the instance's context.


```js

var MyAPI = Jaxire.preset({
  headers: {
    'Accept-Language': 'ru-RU',
  },
  status: {
    noOneKnows: 'all'
  },
  on: {
    noOneKnows: (body, resp) => {
      // do something
    }
  },
  // The request will not be sent untill the function done() be called.
  // Make sure it has been called!
  prepare: function (done) {
    if (this.url === '/slow_response') {
      window.setTimeout(done, 3000)
    } else {
      done()
    }
  },

  // Makes some preparations before sending.
  // Make sure it returns a value!
  send:  function (passedValue) {
    // There you can modify sent data (or instance props) according the instance props:
    // - this.url
    // - this.method (get, post, etc.)
    // - this.format ('text', 'json', 'form' or null)
    // - this.message

    if (this.url === '/notreadyyet') {
      this.url = '/dummy'
    }

    if (this.format === 'json') {
      return {
        data: passedValue,
        href: window.location.href
      }  prepareMergeStrategy: 'pre',
    } else {
      return passedValue
    }
  }
})

```

#### Creating preset from Jaxire instance

Sometimes your request is so useful, so you want to use it's callbacks in other requests. A Jaxire instance also provides `.preset()` method but without any arguments: just to copy callbacks, preparer and sender.

```js

// JXwithPreset has its own preset options that we set before
const CoolRequest = JXwithPreset.post('/')
  .status(/* status object here */)
  .on(/* callback options here */)


CoolRequest.send(/* some data */)

// Wait! There are more requests with similar callbacks!

const CoolRequestsLike = CoolRequest.preset()

// Has the same callbacks as CoolRequest!
CoolRequestLike.get('/')

// Well this one with the same data is a tween of CoolRequest
CoolRequestLike.post('/')
// Seems useless, but who knows?

```

#### Inheritance during creating preset Jaxire constructors

Sometimes you need to use base requests, the more custom ones and much more custom ones. You can extend the preset constructors as much as you want:

```js

// Well in the base api we set some base callback to handle common errors
const BaseAPI = JX.preset(/*opts*/)

// In the user api we add some OAuth2 headers and token expiration check
// before sending. And a bit modify sending data to collect additional info
// about users.
const UserAPI = BaseAPI.preset(/* opts */)

// In the admin api we need all of this user things, but also some
// additional checks before sending and some data changes, and some callbacks...
// But now we can write our requests now much shorter and without duplicating
// general code!
const AdminAPI = UserAPI.preset(/* opts */)

```

In this case `AdminAPI` gets all of previous ones' callbacks, statuses and preparations. To set order of how `prepare` and `send` functions should be called use **sendMergeStrategy** and **prepareMergeStrategy** options.
