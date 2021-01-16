const logSkipFn = function (req, res) {
  // skip logging if method type is options
  if (req.method.toLowerCase() === 'options') {
    return true
  }
  // skip health check with status 200 and favicon requests
  if ((req.url.indexOf('healthcheck') >= 0 && res.statusCode === 200) || (req.url.indexOf('favicon') >= 0)) {
    return true
  }
  return false
}

module.exports = logSkipFn
