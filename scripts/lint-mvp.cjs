const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const failures = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      files.push(...walk(full))
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

for (const file of walk(path.join(root, 'src'))) {
  const rel = path.relative(root, file).replace(/\\/g, '/')
  const text = fs.readFileSync(file, 'utf8')
  const keyMatches = text.match(/sk-[A-Za-z0-9_-]{12,}/g) || []
  if (keyMatches.some((key) => key !== 'sk-your-deepseek-api-key')) failures.push(`${rel}: possible API key literal`)
  if (/身份证号|考生号|手机验证码|志愿系统密码/.test(text) && !/不收集|不保存|不需要/.test(text)) {
    failures.push(`${rel}: sensitive credential field appears outside a disclaimer context`)
  }
  if (/demo\.db|generate_demo_data/.test(text)) failures.push(`${rel}: MVP runtime must not reference demo data`)
  if (/保证录取|最终填报方案|录取概率/.test(text) && !/不得|不会|不能|不是|不输出|不保证|不构成|不提供/.test(text)) {
    failures.push(`${rel}: unsafe admissions promise language`)
  }
}

if (failures.length) {
  console.error('MVP lint failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('MVP lint passed')
