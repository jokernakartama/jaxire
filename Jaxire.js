"use strict"

var xhr = require('xhr')
var urlToStr = require('./helpers/urlToStr')
var compareStatus = require('./helpers/compareStatus')
var setUrlAndMethod = require('./helpers/setUrlAndMethod')

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
 * Creates a callback that calls functions according the response status code
 * @param {Jaxire} instance - Jaxire instance
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 * @returns {Function} - xhr callback
 */
function createCallback (instance, resolve, reject) {
  return function (E, resp, body) {
    for (var statusEvent in instance._callbacksMap) {
      var isStatusSuitable = false

      if (statusEvent in instance._statusesMap) {
        if (instance._statusesMap[statusEvent] instanceof Array) {
          isStatusSuitable = instance._statusesMap[statusEvent].some(function (status) {
            return compareStatus(status, resp.statusCode)
          })
        } else {
          isStatusSuitable = compareStatus(instance._statusesMap[statusEvent], resp.statusCode)
        }

        if (isStatusSuitable) {
          // xhr turns headers to lowercase
          if (resp.headers['content-type'] && resp.headers['content-type'] === 'application/json') {
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

    if (!E) {
      resolve(resp)
    } else {
      reject(E)
    }
  }
}

/**
 * Sends request with params
 * @param {Function} construct - The instance constructor
 * @param {Jaxire} instance - Jaxire instance
 * @param {(string|FormData)} data
 * @param {Function} resolve
 * @param {Function} reject
 */
function makeXHRequest (construct, instance, data, resolve, reject) {
  var headers = {}

  instance = construct(instance)
  if (!instance.url) throw Error('Specify the url before sending')

    for (var header in instance._headersMap) {
      if (typeof instance._headersMap[header] === 'function') {
        headers[header] = instance._headersMap[header].call(instance, data)
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
      createCallback(instance, resolve, reject)
    )
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
   * @returns {Promise}
   */
  /**
   * @namespace Jaxire#send(2)
   */
  Object.defineProperty(prototype, 'send', {
    get: function sendRawData () {
      var ctx = this
      ctx.format = null

      var method = function send (data) {
        return new Promise(ctx._prepareFunc)
          .then(function () {
            var value = ctx._sendFunc(data)
            return new Promise(function (resolve, reject) {
              makeXHRequest(construct, ctx, value, resolve, reject)
            })
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
       * @param {Object} data - Map of params
       * @returns {Promise}
       */
      method.text = function sendText (data) {
        var sendFunc = ctx._sendFunc
        ctx.format = 'text'

        if (ctx._headersMap['Content-Type'] === undefined) {
          ctx._headersMap['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        ctx._sendFunc = function (data) {
          return urlToStr(sendFunc(data))
        }

        return method(data)
      }

      /**
       * Sends JSON-serializable Object. This method is also tries to set
       * "Content-Type" header to "application/json" (if it's not set manually).
       * @method Jaxire#send(2).json
       * @param {Object} data - JSON-serializable data
       * @returns {Promise}
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
       * Sends form data Object. Be sure to prepare it properly!
       * @method Jaxire#send(2).form
       * @param {FormData} data
       * @returns {Promise}
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
   * @type {Object}
   * @property {Object} [headers]
   * @property {StatusMap} [status]
   * @property {Object} [on]
   * @property {PrepareCallback} [prepare]
   * @property {SendCallback} [send]
   * @property {string<'post'|'pre'>} [prepareMergeStrategy='post']
   * @property {string<'post'|'pre'>} [sendMergeStrategy='post'] 
   */
  preset = preset || {}

  var sendMergeStrategy = preset.sendMergeStrategy
  var prepareMergeStrategy = preset.prepareMergeStrategy
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
     * @type {Object}
     */
    this._statusesMap = Object.assign({}, this.constructor._status)
    this._callbacksMap = Object.assign({}, this.constructor._on)
    this._sendFunc = this.constructor._send.bind(this)
    this._prepareFunc = this.constructor._prepare.bind(this)
  }

  mergePresets.bind(this)(F, preset)

  var getInstance = function (o) {
    if (!(o instanceof F)) {
      return new F()
    } else {
      return o
    }
  }

  /**
   * Sets request headers
   * @method Jaxire#headers
   * @param {Object} headers
   * @returns {Jaxire}
   */
  F.headers = function (headers) {
    var instance = getInstance(this)

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
   * @param {Object} [params] - Serializable Object of url parameters, e. g. /api turns to /api?key=value
   * @returns {Jaxire}
   */
  F.get = function (url, params) {
    params = params || null
    return setUrlAndMethod(getInstance, this, url, 'get', params)
  }

  F.post = function (url, params) {
    params = params || null
    return setUrlAndMethod(getInstance, this, url, 'post', params)
  }

  F.put = function (url, params) {
    params = params || null
    return setUrlAndMethod(getInstance, this, url, 'put', params)
  }

  F.patch = function (url, params) {
    params = params || null
    return setUrlAndMethod(getInstance, this, url, 'patch', params)
  }

  F.delete = function (url, params) {
    params = params || null
    return setUrlAndMethod(getInstance, this, url, 'delete', params)
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
    var instance = getInstance(this)
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
    var instance = getInstance(this)
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
    var instance = getInstance(this)
    instance.message = message
    return instance
  }

  setSendMethod(getInstance, F.prototype)

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
