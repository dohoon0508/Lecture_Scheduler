/**
 * Chromium 바이너리를 PROJECT_ROOT/.playwright-browsers 에 설치합니다.
 * `npm install` 후 postinstall 또는 `npm run setup:playwright` 로 실행됩니다.
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensurePlaywrightBrowsersPath, PLAYWRIGHT_BROWSERS_DIR } from '../server/playwright-paths.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(scriptDir, '..')

ensurePlaywrightBrowsersPath()
console.log('[playwright] PLAYWRIGHT_BROWSERS_PATH =', PLAYWRIGHT_BROWSERS_DIR)

const result = spawnSync(
  'npx',
  ['playwright', 'install', 'chromium'],
  {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: PLAYWRIGHT_BROWSERS_DIR },
    shell: process.platform === 'win32',
  },
)

process.exit(result.status === 0 ? 0 : 1)
