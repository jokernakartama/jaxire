var statusToRegexp = require('./statusToRegexp')

/**
 * Checks whether response status code matches its description
 * @param {(string|number)} status - A response status description
 * @param {number} statusCode - A response status code
 * @returns {boolean}
 */
function compareStatus (status, statusCode) {
  var negation = false

  statusCode = String(statusCode)
  status = String(status).toLowerCase()

  if (status === 'all') return true

    if (status.slice(0, 1) === '!') {
      negation = true
    }

    if (negation) {
      return !statusToRegexp(status.slice(1)).test(statusCode)
    } else {
      return statusToRegexp(status).test(statusCode)
    }
}

module.exports = compareStatus
