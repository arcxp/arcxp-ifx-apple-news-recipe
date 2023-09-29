const FormData = require('form-data')
const CryptoJS = require('crypto-js')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const createFormData = (article, articleMetadata, boundary) => {
  const form = new FormData()
  form.setBoundary(boundary)

  if (articleMetadata && Object.keys(articleMetadata).length) {
    form.append('metadata', JSON.stringify(articleMetadata), { contentType: 'application/json' })
  }

  if (article && Object.keys(article).length) {
    form.append('article.json', JSON.stringify(article), { filename: 'article.json', contentType: 'application/json' })
  }

  return form
}

const createCanonicalRequest = (method, url, date) => {
  return method + url + date
}

const generateBoundary = () => {
  return CryptoJS.lib.WordArray.random(16).toString()
}

const dateInISO8601 = () => {
  return dayjs.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')
}

const generateSignature = (canonicalRequest, appleNewsKeySecret) => {
  const encodedKey = CryptoJS.enc.Base64.parse(appleNewsKeySecret)
  const hash = CryptoJS.HmacSHA256(canonicalRequest, encodedKey)
  return CryptoJS.enc.Base64.stringify(hash)
}

module.exports = {
  createFormData,
  createCanonicalRequest,
  generateBoundary,
  dateInISO8601,
  generateSignature
}
