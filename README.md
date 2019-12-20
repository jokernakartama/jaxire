# jaxire

A small wrapper over [xhr](https://www.npmjs.com/package/xhr) to write declarative ajax requests for REST api services.

## Why

I needed an ajax library that can help me to write api requests self-documented way. It keeps your status-code-based callbacks pretty clear. Inspired of Django requests style and Chai assertion library chains.

## Installation

```

npm install jaxire

```

## Basic usage

Any Jaxire method creates a new instance at the first time, others just change its properties. It is required to set the method and the url, and to call .send() after all configurations.

```js

// I just use two letters as use two space identation
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

Sets the request method by calling `.get()`, `.post()`, `.delete()`, `.patch()` or `.put()` and url

```js

// GET /posts?limit=10&page=2
JX.get('/posts', { limit: 10, page: 2 })

```

#### .status(statuses)

Sets groups of status codes for callbacks. You can use arrays for multiple statuses, strings started with "!" to exclude and a keyword "all" to include any status code.

```js

JX.status({
  ok: [200, 201],
  error: ['!201', '!200', '!500'],
  somethingGoesTotallyWrong: 500,
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

#### .descr(str)

Just sets a description for the request, that can be used in callbacks and (what is more useful) in presets. A short message helps you describe what is happening there better than the request url and method, especially when the url contains dynamic parameters.

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

#### .send(data)

Sends the data. Also provides to set content type by calling it's own methods: `.send.json()`, `.send.text()`, `.send.form()`. You do not need to set Content-Type manually if you use one of them!

```js

JX
  ...
  // configured before
  // I use just send() with no arguments when they are not required
  .send()
  // Serializable data can be sent as JSON
  // .send.json({ key: 'value', list: [1, 2, 3]})
  // URIEncoded string, uses .toString() to serialize values!
  // sends name=John&lastname=Doe&visible=false
  // .send.text({ name: 'John', lastname: 'Doe', visible: false })
  // FormData object
  // .send.form(new FormData())

```

The method `.send()` will send a request so it should be last method you call and it is required if you want to send the request!

## Presets

Sometimes you need to permanently set some parameters for all requests. Jaxire provides a special method `.preset(config)` to create preconfigured Jaxire-like constructors. The options is similar to Jaxire methods.

### Preset options

* **headers** - an object of headers that be preset in each instance of the constructor
* **status** - an object of statuses
* **on** - an object of callbacks (unlike an instance method)
* **prepare** - a function that be called before sending request. Passes one argumnent: a function that should be called if you need to continue and send request. Should be useful to *make asynchronuos actions* before sending or to stop the request conditionally.
* **send** - a function that can modify sent data before it will be sent.


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
      }
    } else {
      return passedValue
    }
  }
})

```

