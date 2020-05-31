 /**
 * Serializes objects to urlencoded query string
 * @param {Object} params - Object of key-value pairs
 * @returns {string}
 */
function getQueryString (params) {
  var str = ''

  for (var key in params) {
    var value = params[key]
    if (value !== undefined && value !== null) {
      if (
        typeof value === 'object' && 
        (
          Object.prototype.toString.call(value) === '[object Array]' ||
          Object.prototype.toString.call(value) === '[object Set]'
        )
      ) {
        for (var element of value) {
          str = str + '&' + key + '=' + encodeURIComponent(element.toString())
        }

        continue
      }

      str = str + '&' + key + '=' + encodeURIComponent(value.toString())
    }
  }

  return str.slice(1)
}

module.exports = getQueryString
