"use strict"

var xhr = require('xhr')

/**
 * @namespace Jaxire(2)
 * @borrows Jaxire#headers as headers
 * @borrows Jaxire#get as get
 * @borrows Jaxire#get as post
 * @borrows Jaxire#get as put
 * @borrows Jaxire#get as patch
 * @borrows Jaxire#get as delete
 * @borrows Jaxire#status as status
 * @borrows Jaxire#on as on
 * @borrows Jaxire#descr as descr
 */
var Jaxire = factory()

/**
 * Serializes objects to urlencoded query string
 * @param {object} data - Object of key-value pairs
 * @returns {string}
 */
function urlStr (data) {
  var str = ''

  for (var key in data) {
    var value = data[key]
    if (value !== undefined && value !== null) {
      str = str + '&' + key + '=' + encodeURIComponent(data[key].toString())
    }
  }

  return str.slice(1)
}

/**
 * Calls function according on response status
 * @param {Jaxire} instance - Jaxire instance
 * @returns {Function} - xhr callback
 */
function callback (instance) {
  return function (E, resp, body) {
    for (var statusEvent in instance._callbacksMap) {
      var rule = false
      if (statusEvent in instance._statusesMap) {
        if (instance._statusesMap[statusEvent] instanceof Array) {
          // status arrays
          var excludes = []
          var includes = []
          for (var n = 0; n < instance._statusesMap[statusEvent].length; n++) {
            if (typeof instance._statusesMap[statusEvent][n] === 'number') {
              includes.push(instance._statusesMap[statusEvent][n])
            } else if (typeof instance._statusesMap[statusEvent][n] === 'string' && /^!\d{3}/.test(instance._statusesMap[statusEvent][n])) {
              excludes.push(Number(instance._statusesMap[statusEvent][n].slice(1)))
            }
          }
          if (
            (includes.length > 0 && includes.indexOf(resp.statusCode) > -1) ||
            (includes.length === 0 && excludes.length > 0 && excludes.indexOf(resp.statusCode) === -1)
          ) {
            rule = true
          }
        } else if (typeof instance._statusesMap[statusEvent] === 'number' && instance._statusesMap[statusEvent] === resp.statusCode) {
          // status number
          rule = true
        } else if (typeof instance._statusesMap[statusEvent] === 'string') {
          // status string
          if (instance._statusesMap[statusEvent].toLowerCase() === 'all') {
            // for all statuses
            rule = true
          } else if (instance._statusesMap[statusEvent].slice(0, 1) === '!' && +instance._statusesMap[statusEvent].slice(1) !== resp.statusCode) {
            rule = true
          }
        }
        if (rule) {
          if (resp.headers['content-type'] && resp.headers['content-type'].indexOf('application/json') > -1) {
            try {
              body = JSON.parse(body)
              resp.body = body
            } catch (e) {
              if (e); // pass
            }
          }
          instance._callbacksMap[statusEvent].bind(instance)(body, resp)
        }
      }
    }
    // clear object after request
    instance.url = ''
    instance.method = ''
    instance.message = ''
    instance._headersMap = Object.assign({}, instance.constructor._headers)
    instance._statusesMap = Object.assign({}, instance.constructor._status)
    instance._callbacksMap = Object.assign({}, instance.constructor._on)
    instance._sendFunc = instance.constructor._send.bind(instance)
    instance._prepareFunc = instance.constructor._prepare.bind(instance)
  }
}

/**
 * Sends request with params
 * @param {Jaxire} instance - Jaxire instance
 * @param {(string|FormData)} data
 */
function request (construct, instance, data) {
  var headers = {}

  instance = construct(instance)
  if (!instance.url) throw Error('Specify the url before sending')


  for (var header in instance._headersMap) {
    if (typeof instance._headersMap[header] === 'function') {
      headers[header] = instance._headersMap[header]()
    } else {
      headers[header] = instance._headersMap[header]
    }
  }

  xhr(
    instance.url,
    {
      method: instance.method,
      body: data,
      headers: headers
    },
    callback(instance)
  )
}

/**
 * Sets instance query parameters
 * @param {Jaxire} instance - Jaxire instance
 * @param {string} url - URL without any query parameters
 * @param {string} method
 * @param {string} params - Query parameters
 */
function setUrlAndMethod (construct, instance, url, method, params) {
  var query

  instance = construct(instance)
  instance.method = method
  instance.url = url

  if (params && typeof params === 'object') {
    query = urlStr(params)
    if (query !== '') instance.url = instance.url + '?' + query
  }

  return instance
}

/**
 * Defines "send" method for a Jaxire instance
 * @param {Function} construct - A new Jaxire instance constructor
 * @param {(Function|Jaxire)} prototype - A Jaxire instance or it's constructor 
 */
function setSendMethod (construct, prototype) {
  /**
   * Sends data. You should specify url and method by Jaxire[method](url, queryparams) before.
   * This is the base method that used for already serialized data (and previously set headers).
   * It also has shortcuts to send [urlencoded text]{@link Jaxire#send(2).text},
   * [json]{@link Jaxire#send(2).json} and [FormData]{@link Jaxire#send(2).form}.
   * @see Jaxire#send(2)
   * @method Jaxire#send
   * @param {string} [data] - Data to send
   * @param {string} [clean] - Whether the data should not use preset's "send" option
   */
  /**
   * @namespace Jaxire#send(2)
   */
  Object.defineProperty(prototype, 'send', {
    get: function () {
      var ctx = this
      ctx.format = null

      var method = function send (data) {
        return new Promise(ctx._prepareFunc)
          .then(function () {
            var value = ctx._sendFunc(data)
            request(construct, ctx, value)
          })
          .catch(function (error) {
            throw Error(error)
          })
      }
      
      /**
       * Sends "key-value" map as urlencoded serialized text.
       * This metod is also tries to set "Content-Type" to
       * "application/x-www-form-urlencoded" (if it's not set manually).
       * @method Jaxire#send(2).text
       * @param {object} data - Map of params
       */
      method.text = function sendText (data) {
        var sendFunc = ctx._sendFunc
        ctx.format = 'text'

        if (ctx._headersMap['Content-Type'] === undefined) {
          ctx._headersMap['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        ctx._sendFunc = function (data) {
          return urlStr(sendFunc(data))
        }

        return method(data)
      }

      /**
       * Sends JSON-serializable object. This method is also tries to set
       * "Content-Type" header to "application/json" (if it's not set manually).
       * @method Jaxire#send(2).json
       * @param {object} data - JSON-serializable data
       */
      method.json = function sendJSON (data) {
        var sendFunc = ctx._sendFunc
        ctx.format = 'json'

        if (ctx._headersMap['Content-Type'] === undefined) {
          ctx._headersMap['Content-Type'] = 'application/json'
        }

        ctx._sendFunc = function (data) {
          return JSON.stringify(sendFunc(data))
        }

        return method(data)
      }

      /**
       * Sends form data object. Be sure to prepare it properly!
       * @method Jaxire#send(2).form
       * @param {FormData} data
       */
      method.form = function sendFormData (data) {
        ctx.format = 'form'

        return method(data)
      }

      return method
    },

    set: function (val) {
      return val
    }
  })
}

function mergePresets (func, preset) {
  /**
   * @typedef PresetOptions
   * @type {object}
   * @property {object} [headers]
   * @property {StatusMap} [status]
   * @property {object} [on]
   * @property {PrepareCallback} [prepare]
   * @property {SendCallback} [send]
   * @property {string<'post'|'pre'>} [prepareMergeStrategy='post']
   * @property {string<'post'|'pre'>} [sendMergeStrategy='post'] 
   */
  preset = preset || {}

  var sendMergeStrategy = preset.sendMergeStrategy || 'post'
  var prepareMergeStrategy = preset.prepareMergeStrategy || 'post'
  var sendFunc = preset.send || function (val) { return val }
  var prepareFunc = preset.prepare || function (done) { done() }
  var sendMethod = preset.send || function (val) { return val }
  var prepareMethod = preset.prepare || function (done) { done() }

  func._headers = Object.assign({}, (this ? this._headers : {}), (preset.headers || {}))
  func._status = Object.assign({}, (this ? this._status : {}), (preset.status || {}))
  func._on = Object.assign({}, (this ? this._on : {}), (preset.on || {}))

  if (this) {
    var parentSendFunc = this._send
    var parentPrepareFunc = this._prepare

    if (sendMergeStrategy === 'post') {
      sendMethod = function (value) {
        return sendFunc.call(this, parentSendFunc.call(this, value))
      }
    } else if (sendMergeStrategy === 'pre') {
      sendMethod = function (value) {
        return parentSendFunc.call(this, sendFunc.call(this, value))
      }
    }

    if (prepareMergeStrategy === 'post') {
      prepareMethod = function (done) {
        var ctx = this

        new Promise(parentPrepareFunc.bind(ctx))
          .then(function () {
            return new Promise(prepareFunc.bind(ctx))
          })
          .then(done)
          .catch(function (error) {
            throw Error(error)
          })
        
      }
    } else if (prepareMergeStrategy === 'pre') {
      prepareMethod = function (done) {
        var ctx = this

        new Promise(prepareFunc.bind(ctx))
          .then(function () {
            return new Promise(parentPrepareFunc.bind(ctx))
          })
          .then(done)
          .catch(function (error) {
            throw Error(error)
          })
      }
    }
  }
  
  /**
   * @callback SendCallback
   * @param {*} data - Any data to send
   * @returns {*} Modified (or not) data
   */
  func._send = sendMethod

  /**
   * @callback PrepareCallback
   * @param {Function} done - Call this function when
   * all preparations are complete
   */
  func._prepare = prepareMethod

  return func
}

function factory (preset) {
  /**
   * @class Jaxire
   * @borrows Jaxire#get as Jaxire#post
   * @borrows Jaxire#get as Jaxire#put
   * @borrows Jaxire#get as Jaxire#patch
   * @borrows Jaxire#get as Jaxire#delete
   */
  var F = function Jaxire () {
    /**
     * The set request url
     * @member {string} Jaxire#url
     */
    this.url = ''
    /**
     * The request method
     * @member {string} Jaxire#method
     */
    this.method = ''
    /**
     * Any data that helps to describe the request
     * @member {*} Jaxire#message
     */
    this.message = ''
    this._headersMap = Object.assign({}, this.constructor._headers)
    /**
     * @typedef StatusMap
     * @type {object<(string|number|Array<string|number>)>}
     */
    this._statusesMap = Object.assign({}, this.constructor._status)
    this._callbacksMap = Object.assign({}, this.constructor._on)
    this._sendFunc = this.constructor._send.bind(this)
    this._prepareFunc = this.constructor._prepare.bind(this)
  }

  mergePresets.bind(this)(F, preset)

  var create = function (o) {
    if (!(o instanceof F)) {
      return new F()
    } else {
      return o
    }
  }

  /**
   * Sets request headers
   * @method Jaxire#headers
   * @param {object} headers
   * @returns {Jaxire} A Jaxire instance
   */
  F.headers = function (headers) {
    var instance = create(this)

    if (headers) {
      instance._headersMap = Object.assign({}, instance._headersMap, headers)
    }

    return instance
  }

  // Request methods

  /**
   * Sets request method and query url. Do not use parameters in url,
   * if you use the second argument!
   * @method Jaxire#get
   * @param {string} url - Url without any parameters
   * @param {object} [params] - Serializable object of url parameters, e. g. /api turns to /api?key=value
   * @returns {Jaxire}
   */
  F.get = function (url, params) {
    params = params || null
    return setUrlAndMethod(create, this, url, 'get', params)
  }

  F.post = function (url, params) {
    params = params || null
    return setUrlAndMethod(create, this, url, 'post', params)
  }

  F.put = function (url, params) {
    params = params || null
    return setUrlAndMethod(create, this, url, 'put', params)
  }

  F.patch = function (url, params) {
    params = params || null
    return setUrlAndMethod(create, this, url, 'patch', params)
  }

  F.delete = function (url, params) {
    params = params || null
    return setUrlAndMethod(create, this, url, 'delete', params)
  }

  // Response callbacks

  /**
   * Sets response statuses which initiate callback
   * @example
   * {success: [200, 201], error: ['!200', '!201'], yourcallbackname: 'all'}
   * @method Jaxire#status
   * @param {StatusMap} statuses
   * @returns {Jaxire}
   */
  F.status = function Jaxire (statuses) {
    var instance = create(this)
    instance._statusesMap = Object.assign(instance._statusesMap, statuses)
    return instance
  }

  /**
   * Sets function for callback name
   * @method Jaxire#on
   * @param {string} state - Callback name
   * @param {function} fn - xhr callback: function(responseBody, responseData)
   * @returns {Jaxire}
   */
  F.on = function (state, fn) {
    var instance = create(this)
    instance._callbacksMap[state] = fn
    return instance
  }

  /**
   * Sets Jaxire#message for the request
   * @method Jaxire#descr
   * @param {*} message - Any data
   * @returns {Jaxire}
   */
  F.descr = function (message) {
    var instance = create(this)
    instance.message = message
    return instance
  }

  setSendMethod(create, F.prototype)
  F.preset = factory
  F.prototype.headers = F.headers
  F.prototype.get = F.get
  F.prototype.post = F.post
  F.prototype.put = F.put
  F.prototype.patch = F.patch
  F.prototype.delete = F.delete
  F.prototype.status = F.status
  F.prototype.on = F.on
  F.prototype.descr = F.descr

  return F
}

/**
 * Defines some properties and default behavior
 * @method Jaxire(2).preset
 * @param {PresetOptions} preset
 * @returns {Function} A new Jaxire constructor
 */
Jaxire.preset = factory

/**
 * Generates a new Jaxire constructor with the current
 * instance's options
 * @method Jaxire#preset
 * @returns {Function} New Jaxire constructor
 */
Jaxire.prototype.preset = function () {
  var instance = this

  return Jaxire.preset({
    headers: instance._headersMap,
    status: instance._statusesMap,
    on: instance._callbacksMap,
    send: instance._sendFunc,
    prepare: instance._prepareFunc
  })
}

module.exports = Jaxire
module.exports.default = Jaxire

