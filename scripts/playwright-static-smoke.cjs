const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { chromium } = require('playwright')

const root = path.join(__dirname, '..')
const outDir = path.join(root, 'out')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html;charset=utf-8'
  if (file.endsWith('.js')) return 'text/javascript;charset=utf-8'
  if (file.endsWith('.css')) return 'text/css;charset=utf-8'
  if (file.endsWith('.json')) return 'application/json;charset=utf-8'
  if (file.endsWith('.png')) return 'image/png'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '')
  const direct = path.join(outDir, cleanPath)
  const normalized = path.normalize(direct)
  if (!normalized.startsWith(outDir)) return null
  if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) return normalized
  const indexFile = path.join(normalized, 'index.html')
  if (fs.existsSync(indexFile)) return indexFile
  return null
}

function startServer() {
  const server = http.createServer((req, res) => {
    const file = resolveFile(req.url || '/')
    if (!file) {
      const notFound = path.join(outDir, '404.html')
      res.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' })
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'not found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType(file) })
    res.end(fs.readFileSync(file))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({ server, url: `http://127.0.0.1:${address.port}` })
    })
  })
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  assert.strictEqual(overflow, false, 'page has horizontal overflow')
}

async function main() {
  assert(fs.existsSync(path.join(outDir, 'index.html')), 'run npm run build before smoke test')
  const { server, url } = await startServer()
  const launchOptions = fs.existsSync(edgePath) ? { executablePath: edgePath } : {}
  const browser = await chromium.launch(launchOptions)
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
    const requests = []
    page.on('request', (request) => requests.push(request.url()))

    for (const route of ['/', '/official/', '/questionnaire/', '/results/', '/sources/', '/disclaimer/']) {
      await page.goto(`${url}${route}`, { waitUntil: 'networkidle' })
      assert.strictEqual(await page.locator('body').count(), 1)
      await assertNoOverflow(page)
    }

    await page.goto(`${url}/official/`, { waitUntil: 'networkidle' })
    await page.getByPlaceholder('例：深圳大学 / 10590 / 221').fill('深圳大学')
    await page.waitForTimeout(300)
    const resultText = await page.locator('body').innerText()
    assert(resultText.includes('深圳大学'), 'official search result missing')
    assert(resultText.includes('不是具体专业录取数据'), 'official disclaimer missing')

    await page.goto(`${url}/questionnaire/`, { waitUntil: 'networkidle' })
    await page.getByText('清空本地方案').waitFor({ state: 'visible' })
    await assertNoOverflow(page)

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${url}/official/`, { waitUntil: 'networkidle' })
    await assertNoOverflow(page)

    const badApiRequest = requests.find((item) => item.includes('/api/'))
    assert(!badApiRequest, `static page called API route: ${badApiRequest}`)
    console.log(JSON.stringify({ ok: true, baseUrl: url, checkedRoutes: 6 }))
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
