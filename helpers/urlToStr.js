 /**
 * Serializes objects to urlencoded query string
 * @param {object} data - Object of key-value pairs
 * @returns {string}
 */
function urlToStr (data) {
    var str = ''
  
    for (var key in data) {
      var value = data[key]
      if (value !== undefined && value !== null) {
        str = str + '&' + key + '=' + encodeURIComponent(data[key].toString())
      }
    }
  
    return str.slice(1)
  }

module.exports = urlToStr
