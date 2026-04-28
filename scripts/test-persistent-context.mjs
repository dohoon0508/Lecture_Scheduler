/**
 * 인프런 크롤러와 동일하게 persistent context + executablePath 로 Chromium 기동 검증
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  ensurePlaywrightBrowsersPath,
  resolveChromiumExecutable,
} from '../server/playwright-paths.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const testProfile = path.join(projectRoot, '.playwright-test-profile-temp')

ensurePlaywrightBrowsersPath()
const execPath = resolveChromiumExecutable()
if (!execPath || !fs.existsSync(execPath)) {
  console.error('[FAIL] Chromium 실행 파일 없음:', execPath)
  console.error('실행: npm run setup:playwright')
  process.exit(1)
}

console.log('[ok] executablePath =', execPath)

fs.rmSync(testProfile, { recursive: true, force: true })
fs.mkdirSync(testProfile, { recursive: true })

const { chromium } = await import('playwright')
const ctx = await chromium.launchPersistentContext(testProfile, {
  headless: true,
  executablePath: execPath,
})
try {
  const page = await ctx.newPage()
  await page.goto('https://example.com', { timeout: 15000 })
  const t = await page.title()
  console.log('[ok] persistent context + 페이지 로드:', t)
} finally {
  await ctx.close()
  fs.rmSync(testProfile, { recursive: true, force: true })
}
