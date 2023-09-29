const getAppleNewsConfig = () => {
  const { NODE_ENV } = process.env
  const appleNewsConfigPath = NODE_ENV === 'test'
    ? '../../.jest/apple-news-conf-test.json'
    : `../../apple-news-conf-${NODE_ENV}.json`

  return require(appleNewsConfigPath)
}

const getWebsiteBaseURL = (website) => {
  const websiteInScreamingSnakeCase = website.toUpperCase().replaceAll('-', '_')
  return process.env[`${websiteInScreamingSnakeCase}_BASE_URL`]
}

module.exports = {
  getWebsiteBaseURL,
  getAppleNewsConfig
}
