/**
 * Playwright가 프로젝트 경로의 Chromium을 찾는지 검증합니다.
 * 실행: npm run test:playwright
 */
import { ensurePlaywrightBrowsersPath } from '../server/playwright-paths.js'

ensurePlaywrightBrowsersPath()

const { chromium } = await import('playwright')

const ctx = await chromium.launch({ headless: true })
try {
  const page = await ctx.newPage()
  await page.goto('about:blank')
  console.log('[test:playwright] Chromium 실행 OK')
} finally {
  await ctx.close()
}
