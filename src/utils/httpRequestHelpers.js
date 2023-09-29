const isResponseStatusOk = (statusCode) => {
  return statusCode >= 200 && statusCode < 300
}

module.exports = {
  isResponseStatusOk
}
