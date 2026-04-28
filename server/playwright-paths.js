import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 프로젝트 루트 (server/ 의 상위) */
export const PROJECT_ROOT = path.resolve(path.join(__dirname, '..'))

/** Playwright 브라우저 바이너리 저장 위치 (샌드박스 임시 경로 대신 고정) */
export const PLAYWRIGHT_BROWSERS_DIR = path.join(
  PROJECT_ROOT,
  '.playwright-browsers',
)

/**
 * PLAYWRIGHT_BROWSERS_PATH를 설정합니다. playwright 모듈 로드 **전**에 호출해야 합니다.
 */
export function ensurePlaywrightBrowsersPath() {
  fs.mkdirSync(PLAYWRIGHT_BROWSERS_DIR, { recursive: true })
  process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_DIR
}

/**
 * 설치된 Chromium 실행 파일 절대 경로 (없으면 null).
 * PLAYWRIGHT_BROWSERS_PATH만으로는 샌드박스/캐시 꼬임이 있어 launch 시 명시적으로 넘깁니다.
 */
export function resolveChromiumExecutable() {
  ensurePlaywrightBrowsersPath()
  const root = PLAYWRIGHT_BROWSERS_DIR
  if (!fs.existsSync(root)) {
    return null
  }

  let entries
  try {
    entries = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('chromium-'))
      .map((d) => d.name)
      .sort()
  } catch {
    return null
  }

  const platform = os.platform()
  const candidatesByPlatform = {
    darwin: [
      'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    ],
    linux: ['chrome-linux64/chrome'],
    win32: ['chrome-win64/chrome.exe', 'chrome-win32/chrome.exe'],
  }

  const rels = candidatesByPlatform[platform] || candidatesByPlatform.linux

  for (const name of entries) {
    const base = path.join(root, name)
    for (const rel of rels) {
      const full = path.join(base, ...rel.split('/'))
      try {
        if (fs.existsSync(full)) {
          return full
        }
      } catch {
        /* ignore */
      }
    }
  }

  return null
}
