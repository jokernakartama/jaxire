"use strict"

var xhr = require('xhr')
var Jaxire = factory()

/**
 * Serializes objects to urlencoded query string
 * @param {object} data
 * @returns {string}
 */
function urlStr (data) {
  var str = ''
  for (var key in data) {
    var value = data[key]
    if (value !== undefined && value !== null) str = str + '&' + key + '=' + encodeURIComponent(data[key].toString())
  }
  return str.slice(1)
}

/**
 * Calls function according on response status
 * @param {Jaxire} instance - Jaxire instance
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
    /**
     * Sends request with params
     */
    instance = construct(instance)
    if (!instance.url) throw Error('Specify the url before sending')
    var headers = {}
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
  instance = construct(instance)
  instance.method = method
  instance.url = url
  var query
  if (params && typeof params === 'object') {
    query = urlStr(params)
    if (query !== '') instance.url = instance.url + '?' + query
  }
  return instance
}

/**
 * Sends data. You should specify url and method by Jaxire[method](url, queryparams) before.
 * This method has some shortcuts and in most cases it is used by itself when intends to send no data.
 * @param {string} data - Data to send
 * @param {string} contentType
 * @namespace Jaxire
 * @name send
 */
function setSendMethod (construct, prototype) {
  Object.defineProperty(prototype, 'send', {
    // Call .send() if you do not to send any data (or serialize data and define contentType manually)
    // Call .send.json(ObjectThatCanBeStringified) to send json
    // Call .send.text(ObjectWhichPropertiesArePrimitives) to send urlencoded query string
    // Call .send.form(FormDataObject) to send a FormData object
    get: function () {
      var ctx = this
      ctx.format = null
      var method = function send (data) {
        return new Promise (ctx._prepareFunc)
          .then(function () {
            request(construct, ctx, data)
          })
      }
      method.text = function sendText (data) {
        ctx.format = 'text'
        if (ctx._headersMap['Content-Type'] === undefined) {
          ctx._headersMap['Content-Type'] = 'application/x-www-form-urlencoded'
        }
        method(urlStr(ctx._sendFunc(data)))
      }
      method.json = function sendJSON (data) {
        ctx.format = 'json'
        if (ctx._headersMap['Content-Type'] === undefined) {
          ctx._headersMap['Content-Type'] = 'application/json'
        }
        data = JSON.stringify(ctx._sendFunc(data))
        method(data)
      }
      method.form = function sendFormData (data) {
        ctx.format = 'form'
        method(ctx._sendFunc(data), null)
      }
      return method
    },
    set: function (val) {
      return val
    }
  })
}

function factory (preset) {
  preset = preset || {}
  var F = function Jaxire () {
    this.url = ''
    this.method = ''
    this.message = ''
    this._headersMap = Object.assign({}, this.constructor._headers)
    this._statusesMap = Object.assign({}, this.constructor._status)
    this._callbacksMap = Object.assign({}, this.constructor._on)
    this._sendFunc = this.constructor._send.bind(this)
    this._prepareFunc = this.constructor._prepare.bind(this)
  }
  F._headers = preset.headers || {}
  F._status = preset.status || {}
  F._on = preset.on || {}
  F._send = preset.send || function (val) { return val }
  F._prepare = preset.prepare || function (done) { done() }

  var create = function (o) {
    if (!(o instanceof F)) {
      return new F()
    } else {
      return o
    }
  }
  /**
   * Sets request headers
   * @param {object} headers
   */
  F.headers = function (headers) {
    var instance = create(this)
    if (headers) instance._headersMap = Object.assign({}, instance._headersMap, headers)
    return instance
  }

  // methods
  /**
   * Jaxire[method] set request method and query url
   * @param {string} url - Url without any parameters
   * @param {object} params - Serializable object of url parameters, e. g. /api turns to /api?key=value
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
  // callbacks
  /**
   * Sets response statuses which initiate callback
   * @example
   * {'success': [200, 201], error: ['!200', '!201'], 'yourcallbackname': 'all'}
   * @param {object} st
   * @returns {Jaxire}
   */
  F.status = function Jaxire (st) {
    var instance = create(this)
    instance._statusesMap = Object.assign(instance._statusesMap, st)
    return instance
  }

  /**
   * Sets function for callback name
   * @param {string} state - Callback name
   * @param {function} fn - Function(responseBody, responseData)
   * @returns {Jaxire}
   */
  F.on = function (state, fn) {
    var instance = create(this)
    instance._callbacksMap[state] = fn
    return instance
  }

  F.descr = function (message) {
    var instance = create(this)
    instance.message = message
    return instance
  }

  setSendMethod(create, F.prototype)
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

Jaxire.preset = factory

Jaxire.prototype.preset = function () {
  var instance = this
  return Jaxire.preset({
    headers: instance._headersMap,
    status: instance._statusesMap,
    on: instance._callbacksMap,
    send: instance._sendFunc
  })
}

module.exports = Jaxire
module.exports.default = Jaxire
