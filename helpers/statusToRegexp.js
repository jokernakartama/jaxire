/**
 * Transforms a status description (like 5xx) to regexp
 * @param {string} status - A response status description
 * @returns {RegExp}
 */
function statusToRegexp (status) {
  var regexp = new RegExp(status.slice(0, 3).replace(/x/gi, '[0-9]'))
  return regexp
} 

module.exports = statusToRegexp
