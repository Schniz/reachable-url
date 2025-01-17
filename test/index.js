'use strict'

const { URL } = require('url')
const test = require('ava')
const got = require('got')

const reachableUrl = require('..')

const { isReachable } = reachableUrl

test('resolve GET request', async t => {
  const url = 'https://httpbin.org/get'
  const res = await reachableUrl(url)
  t.deepEqual(res.redirectUrls, [])
  t.deepEqual(res.redirectStatusCodes, [])
  t.is(res.url, url)
  t.is(200, res.statusCode)
  t.true(isReachable(res))
})

test('resolve as fast a HEAD', async t => {
  const url = 'https://edge-ping.vercel.app/'

  const headResponse = await got.head(url, { throwHttpErrors: false })
  const headTime = headResponse.timings.phases.total

  const getResponse = await reachableUrl(url)
  const getTime = getResponse.timings.phases.total

  t.true(getTime <= headTime * 2)
})

test('resolve prerender GET request', async t => {
  const url = 'https://www.instagram.com/teslamotors'
  const res = await reachableUrl(url)
  t.is(200, res.statusCode)
  t.true(isReachable(res))
})

test('resolve redirect', async t => {
  const url = 'https://github.com/kikobeats/splashy'
  const res = await reachableUrl(url)
  t.deepEqual(res.redirectUrls, ['https://github.com/kikobeats/splashy'])
  t.deepEqual(res.redirectStatusCodes, [301])
  t.is('https://github.com/microlinkhq/splashy', res.url)
  t.is(200, res.statusCode)
  t.true(isReachable(res))
})

test('resolve multiple redirects', async t => {
  const url =
    'https://test-redirect-drab.vercel.app/?url=https%3A%2F%2Ftest-redirect-drab.vercel.app%3Furl%3Dhttps%253A%252F%252Ftest-redirect-drab.vercel.app%252F%253Furl%253Dhttps%253A%252F%252Fexample.com'
  const res = await reachableUrl(url)

  t.deepEqual(res.redirectUrls, [
    'https://test-redirect-drab.vercel.app/?url=https%3A%2F%2Ftest-redirect-drab.vercel.app%3Furl%3Dhttps%253A%252F%252Ftest-redirect-drab.vercel.app%252F%253Furl%253Dhttps%253A%252F%252Fexample.com',
    'https://test-redirect-drab.vercel.app/?url=https%3A%2F%2Ftest-redirect-drab.vercel.app%2F%3Furl%3Dhttps%3A%2F%2Fexample.com',
    'https://test-redirect-drab.vercel.app/?url=https://example.com'
  ])
  t.deepEqual(res.redirectStatusCodes, [302, 302, 302])
  t.is('https://example.com/', res.url)
  t.is(200, res.statusCode)
  t.true(isReachable(res))
})

test('passing options', async t => {
  const url = 'https://test-redirect-drab.vercel.app?url=http%3A%2F%2Fexample.com%2F'
  const res = await reachableUrl(url, { followRedirect: false })
  t.is(302, res.statusCode)
  t.true(isReachable(res))
})

test('resolve non encoding urls', async t => {
  const urlOne =
    'https://httpbin.org/anything/pr-experterna:-s-forsoker-ta-kommando-over-"svenskhet"-i-valfilm-fZlCYGEtZA'
  const resOne = await reachableUrl(urlOne)
  t.is(resOne.url, new URL(resOne.url).href)
  t.is(
    resOne.url,
    'https://httpbin.org/anything/pr-experterna:-s-forsoker-ta-kommando-over-%22svenskhet%22-i-valfilm-fZlCYGEtZA'
  )
  t.is(200, resOne.statusCode)
  t.true(isReachable(resOne))

  const urlTwo =
    'https://httpbin.org/anything/@Acegikmo/the-ever-so-lovely-bézier-curve-eb27514da3bf'
  const resTwo = await reachableUrl(urlTwo)
  t.is(resTwo.url, new URL(resTwo.url).href)
  t.is(
    resTwo.url,
    'https://httpbin.org/anything/@Acegikmo/the-ever-so-lovely-b%C3%A9zier-curve-eb27514da3bf'
  )
  t.is(200, resTwo.statusCode)
  t.true(isReachable(resTwo))
})

test('resolve already encoded urls', async t => {
  const urlThree =
    'https://httpbin.org/anything/@Acegikmo/the-ever-so-lovely-b%C3%A9zier-curve-eb27514da3bf'
  const resThree = await reachableUrl(urlThree)
  t.is(resThree.url, new URL(resThree.url).href)
  t.is(
    resThree.url,
    'https://httpbin.org/anything/@Acegikmo/the-ever-so-lovely-b%C3%A9zier-curve-eb27514da3bf'
  )
  t.is(200, resThree.statusCode)
  t.true(isReachable(resThree))
})

test('keep original query search', async t => {
  const url =
    'https://www.b92.net/biz/vesti/srbija/dogovoreno-nikola-tesla-primer-aerodromu-u-cg-1465369'
  const res = await reachableUrl(url)
  t.is(res.url, url)
  t.is(200, res.statusCode)
  t.is(res.statusMessage, 'OK')
  t.true(Object.keys(res.headers).length > 0)
  t.true(isReachable(res))
})

test("ensure to don't download body", async t => {
  t.timeout(8000)
  const url = 'http://ftp.nluug.nl/pub/graphics/blender/demo/movies/ToS/ToS-4k-1920.mov'
  const res = await reachableUrl(url)
  t.is(res.url, url)
  t.is(200, res.statusCode)
  t.is(res.statusMessage, 'OK')
  t.true(Object.keys(res.headers).length > 0)
})

test('handle DNS errors', async t => {
  const url =
    'http://android-app/com.twitter.android/twitter/user?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eandroidseo%7Ctwgr%5Eprofile&screen_name=Kikobeats'
  const res = await reachableUrl(url)
  t.is(res.url, url)
  t.is(res.statusCode, 404)
  t.is(res.statusMessage, 'Not Found')
  t.is(Object.keys(res.headers).length, 0)
  t.false(isReachable(res))
})

test('keep original request url', async t => {
  const url = 'http://cdn.jsdelivr.net/npm/@microlink/mql@0.6.11/src/browser.js'
  const res = await reachableUrl(url)
  t.is(res.requestUrl, 'http://cdn.jsdelivr.net/npm/@microlink/mql@0.6.11/src/browser.js')
})

test('resolve url redirections', async t => {
  const url =
    'https://test-redirection.vercel.app/?url=https%3A%2F%2Fmicrolink.io%3Fref%3Dproduchunt'
  const res = await reachableUrl(url)
  t.is(res.url, 'https://microlink.io/?ref=produchunt')
})

test('fast unreachable request resolution', async t => {
  t.timeout(1000)
  const url = 'https://httpbin.org/status/404'
  const res = await reachableUrl(url)
  t.is(res.url, url)
  t.is(res.statusCode, 404)
  t.is(res.statusMessage.toLowerCase(), 'not found')
})
