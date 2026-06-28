const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full
  })
}

test('Next.js is configured for static export', () => {
  const config = fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8')
  assert(config.includes('output: "export"') || config.includes("output: 'export'"))
  assert(config.includes('unoptimized: true'))
  assert(config.includes('trailingSlash: true'))
})

test('static app tree contains no API routes', () => {
  assert(!fs.existsSync(path.join(root, 'src', 'app', 'api')), 'src/app/api must not exist for static export')
})

test('frontend source does not call server APIs or expose API keys', () => {
  const files = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/')
    const text = fs.readFileSync(file, 'utf8')
    assert(!/fetch\(['"]\/api\//.test(text), `${rel} calls /api`)
    assert(!/sk-[A-Za-z0-9_-]{12,}/.test(text), `${rel} contains possible API key`)
    assert(!/PrismaClient|@prisma\/client/.test(text), `${rel} imports Prisma runtime`)
  }
})

test('static output exists after build and contains no server-only files', () => {
  const outDir = path.join(root, 'out')
  assert(fs.existsSync(path.join(outDir, 'index.html')), 'out/index.html missing')
  assert(fs.existsSync(path.join(outDir, '404.html')), 'out/404.html missing')
  const files = walk(outDir)
  assert(files.some((file) => file.endsWith(path.join('data', 'official', 'catalog.json'))), 'official catalog missing from out')
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/')
    assert(!rel.includes('node_modules'), `${rel} includes node_modules`)
    assert(!/\.db$|\.sqlite$/.test(rel), `${rel} includes SQLite`)
    if (/\.(html|js|json|txt)$/.test(rel)) {
      const text = fs.readFileSync(file, 'utf8')
      assert(!/sk-[A-Za-z0-9_-]{12,}/.test(text), `${rel} contains possible API key`)
      assert(!/PrismaClient|@prisma\/client/.test(text), `${rel} contains Prisma runtime`)
    }
  }
})

if (process.exitCode) process.exit(process.exitCode)
