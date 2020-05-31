var getQueryString = require('./getQueryString')

/**
 * Sets instance query parameters
 * @param {Jaxire} instance - Jaxire instance
 * @param {string} url - URL without any query parameters
 * @param {string} method
 * @param {string} params - Query parameters
 * @returns {Jaxire}
 */
function setUrlAndMethod (construct, instance, url, method, params) {
  var query

  instance = construct(instance)
  instance.method = method
  instance.url = url

  if (params && typeof params === 'object') {
    query = getQueryString(params)
    if (query !== '') instance.url = instance.url + '?' + query
  }

  return instance
}

module.exports = setUrlAndMethod
