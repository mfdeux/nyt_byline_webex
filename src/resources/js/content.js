let urlRegex = /[0-9]{4}[\/][0-9]{2}[\/][0-9]{2}/
let articleSelector = document.querySelectorAll('main#site-content article a')
let URL_RETRIEVAL_LIMIT = 100

/**
 * Check whether an object is empty or not
 * @param {Object} obj
 */
const isEmpty = (obj) => {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false
  }
  return JSON.stringify(obj) === JSON.stringify({})
}

/**
 * Retrieve byline from url
 * @param {string} url
 * @returns {Promise<string>}
 */
const retrieveByline = async (url) => {
  let resp = await fetch(url)
  let textResp = await resp.text()
  let newDoc = textToDOM(textResp)
  let elem = newDoc.querySelector('[itemprop="author creator"]')
  return elem.textContent.trim()
}

/**
 * Set byline using DOM
 * @param {string} url
 * @param {string} byline
 */
const setByline = (url, byline) => {
  let parsedUrl = new URL(url)
  let selectorText = `a[href="${parsedUrl.pathname}"] h2`
  selector = document.querySelector(selectorText)
  let newElem = document.createElement('span')
  newElem.innerText = `${byline}`
  newElem.className = 'added-byline'
  selector.insertAdjacentElement('afterend', newElem)
}

/**
 * Retrieve article URLs from page
 */
const retrieveArticleURLs = () => {
  let urls = []
  let urlRetrievalLimit = Math.min(URL_RETRIEVAL_LIMIT, articleSelector.length)
  for (let index = 0; index < urlRetrievalLimit; index++) {
    let selector = articleSelector[index]
    let articleUrl = selector.href
    if (urlRegex.test(articleUrl)) {
      urls.push(articleUrl)
    }
  }
  return new Promise((resolve, reject) => {
    resolve(urls)
  })
}

/**
 * Parse html text into a DOM
 * @param {string} textResp
 */
const textToDOM = (textResp) => {
  const parser = new DOMParser()
  return parser.parseFromString(textResp, "text/html")
}

(async function () {
  console.log('------------Executing NYT author byline----------')
  let urls = await retrieveArticleURLs()
  urls.forEach(async (url) => {
    let urlHash = btoa(url).slice(-25)
    let storedData = await chrome.storage.local.get(urlHash)
    if (isEmpty(storedData)) {
      console.log(`Fetching byline for ${url}`)
      try {
        let byline = await retrieveByline(url)
        let browseData = await chrome.storage.local.set({ [urlHash]: byline })
        console.log({ [urlHash]: byline })
        setByline(url, byline)
      } catch (error) {
        console.error(`Unable to fetch byline for ${url}`)
        let browseData = await chrome.storage.local.set({ [urlHash]: null })
      }
    } else {
      console.log(`Fetched stored byline for ${url}`)
      if (storedData[urlHash] != null) {
        setByline(url, storedData[urlHash])
      }
    }
  })
})()
