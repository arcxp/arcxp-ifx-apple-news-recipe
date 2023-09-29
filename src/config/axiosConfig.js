const axios = require('axios')

const createAxiosInstance = (axiosConfig = {}) => {
  axiosConfig = {
    ...axiosConfig,
    headers: {
      'User-agent': 'axios@1.4.0;<add_your_org_id>-<add_your_integration_name>',
      'Content-type': 'application/json',
      ...axiosConfig.headers
    }
  }

  return axios.create(axiosConfig)
}

module.exports = {
  createAxiosInstance
}
