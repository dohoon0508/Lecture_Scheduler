import path from 'path'
import { fileURLToPath } from 'url'
import {
  ensurePlaywrightBrowsersPath,
  resolveChromiumExecutable,
} from '../playwright-paths.js'
import {
  normalizeTitle,
  extractDurationFromLineEnd,
  parseDurationTextToSeconds,
  detectContentType,
} from '../utils/normalize.js'

/** 정적 import보다 먼저 실행돼야 Playwright가 올바른 브라우저 경로를 씁니다. */
ensurePlaywrightBrowsersPath()

/**
 * 인프런 대시보드 크롤링 동작:
 * 1. 커리큘럼 탭으로 들어가 그 패널이 보이도록 준비한다. (모달 제거, 섹션 펼침, 지연 로딩용 스크롤)
 * 2. 그 화면에서만 목차(섹션 + N. 제목)와 시간을 읽어 앱이 쓰는 items/chapters 형식으로 만든다.
 *
 * 비로그인 공개 페이지처럼 커리큘럼 탭 아래에 추천·수강평 블록이 먼저 나오는 경우,
 * 스크롤로 실제 목차(모두 펼치기·섹션·강 번호)가 있는 영역을 드러낸 뒤 점수로 구역을 고른다.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const INFLEARN_USER_DATA_DIR = path.join(
  __dirname,
  '..',
  '.auth',
  'inflearn-user-data',
)

/** 클릭한 커리큘럼 탭의 aria-controls 패널 (수강평/소개 tabpanel 오인 방지) */
/** @type {import('playwright').Locator | null} */
let curriculumPanelLocator = null

function clearCurriculumPanelScope() {
  curriculumPanelLocator = null
}

/** @param {import('playwright').Locator | null} loc */
function setCurriculumPanelScope(loc) {
  curriculumPanelLocator = loc
}

function getCurriculumPanelScope() {
  return curriculumPanelLocator
}

/**
 * 붙여넣기 잡음 제거 + 프로토콜 보정 (브라우저 type=url 실패·따옴표 등)
 * @param {string} raw
 */
export function coerceInflearnUrlInput(raw) {
  let s = String(raw ?? '')
    .trim()
    .replace(/^\uFEFF/, '')
  s = s.replace(/[\n\r\u2028\u2029\t]+/g, '')
  s = s.replace(/^<+/, '').replace(/>+$/, '').trim()
  s = s.replace(/^['"\s]+|['"\s]+$/g, '').trim()
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) {
    if (/^(www\.|m\.)?inflearn\.com/i.test(s)) {
      s = `https://${s.replace(/^(https?:\/\/)?/i, '')}`
    }
  }
  return s.trim()
}

/** @param {URL} u */
function normalizeInflearnHostname(u) {
  const h = u.hostname.toLowerCase()
  if (h === 'm.inflearn.com') {
    u.hostname = 'www.inflearn.com'
  }
}

/**
 * 공개 강의 페이지 `/course/슬러그?cid=…` → 수강 대시보드 `/course/슬러그/dashboard?cid=…`
 * (쿼리·해시는 유지)
 * @param {string} url
 */
export function normalizeInflearnToDashboardUrl(url) {
  const trimmed = coerceInflearnUrlInput(url)
  try {
    const u = new URL(trimmed)
    normalizeInflearnHostname(u)
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'inflearn.com') return trimmed

    let p = u.pathname.replace(/\/+$/, '') || '/'
    const localeCourse = p.match(/^(\/[a-z]{2})?\/course\/(.+)$/i)
    if (!localeCourse) return u.href

    const locale = localeCourse[1] || ''
    const rest = localeCourse[2]
    if (!rest) return u.href

    if (rest === 'dashboard' || /\/dashboard\/?$/.test(rest)) {
      return u.href
    }

    u.pathname = `${locale}/course/${rest}/dashboard`
    return u.href
  } catch {
    return trimmed
  }
}

/** @param {string} url */
export function assertInflearnDashboardUrl(url) {
  try {
    const coerced = coerceInflearnUrlInput(url)
    if (!coerced) {
      return { ok: false, message: 'URL이 비어 있습니다.' }
    }
    const normalized = normalizeInflearnToDashboardUrl(coerced)
    const u = new URL(normalized)
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'inflearn.com') {
      return { ok: false, message: 'inflearn.com 도메인만 허용됩니다.' }
    }
    if (!u.pathname.includes('/course/') || !u.pathname.includes('/dashboard')) {
      return {
        ok: false,
        message:
          '강의 URL은 /course/슬러그 형태이거나 대시보드(/course/.../dashboard)여야 합니다. 수강 중인 강의는 대시보드에서 복사하는 것이 가장 확실합니다.',
      }
    }
    return { ok: true, url: normalized }
  } catch {
    return { ok: false, message: '유효한 URL이 아닙니다.' }
  }
}

/**
 * 언어 설정 등 오버레이 닫기 (커리큘럼 클릭 전에 처리)
 * @param {import('playwright').Page} page
 */
async function dismissInflearnModals(page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const langDialog = page
        .locator('[role="dialog"]')
        .filter({ hasText: /언어\s*설정/ })
      if (await langDialog.isVisible().catch(() => false)) {
        console.log('[inflearn] 언어 설정 모달 닫기')
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(250)
        const closeHit = langDialog
          .locator(
            'button[aria-label="Close"], button[aria-label="닫기"], [data-state] button, header button',
          )
          .first()
        if (await closeHit.isVisible().catch(() => false)) {
          await closeHit.click({ timeout: 1500 }).catch(() => {})
        }
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(200)
        continue
      }
    } catch {
      /* ignore */
    }

    const anyDialog = page.locator('[role="dialog"]').first()
    if (await anyDialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(200)
      continue
    }
    break
  }
}

/**
 * 비로그인(공개) 페이지 등: 커리큘럼 탭 아래에 추천·수강평 카드가 먼저 나와도
 * 스크롤 후 "모두 펼치기 + 섹션 n" 패턴이 보이도록 한다.
 * @param {import('playwright').Page} page
 */
async function scrollMainUntilCurriculumSignals(page) {
  await page.evaluate(async () => {
    const step = Math.max(280, Math.floor(window.innerHeight * 0.72))
    for (let i = 0; i < 14; i += 1) {
      const text = document.body.innerText || ''
      const hasExpand = /모두\s*펼치기|Expand all|전체\s*펼치기/i.test(text)
      const hasSection = /섹션\s*\d|Section\s*\d/.test(text)
      const hasLessonLine = /\d{1,3}\.\s+[^\n]+/.test(text)
      if (hasExpand && hasSection) break
      if (hasSection && hasLessonLine && text.length > 3500) break
      window.scrollBy(0, step)
      await new Promise((r) => {
        setTimeout(r, 130)
      })
    }
  })
  await page.waitForTimeout(200)
}

/**
 * main 안 강의 탭바에서만 "커리큘럼"을 찾아 클릭하고, aria-controls 패널을 고정한다.
 * (페이지 전역 getByRole('tab')는 다른 위젯/수강평 탭과 혼동될 수 있음)
 * @param {import('playwright').Page} page
 */
async function activateCurriculumTab(page) {
  await dismissInflearnModals(page)

  const main = page.locator('main').first()
  if ((await main.count()) === 0) {
    console.log('[inflearn] main 없음 — 커리큘럼 탭 생략')
    return
  }

  const curTabs = main
    .locator('[role="tab"], a[role="tab"]')
    .filter({ hasText: /커리큘럼|Curriculum/i })
  const nTabs = await curTabs.count()
  for (let i = 0; i < nTabs; i += 1) {
    const tab = curTabs.nth(i)
    if (!(await tab.isVisible({ timeout: 2000 }).catch(() => false))) continue

    await tab.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
    })
    await page.waitForTimeout(200)

    console.log('[inflearn] 커리큘럼 탭 클릭 (main, 좌표 클릭)')

    const box = await tab.boundingBox().catch(() => null)
    if (box) {
      await page.mouse.click(
        box.x + Math.min(box.width / 2, 100),
        box.y + box.height / 2,
      )
    } else {
      await tab.click({ timeout: 4000, force: true })
    }

    await page.waitForTimeout(900)
    await scrollMainUntilCurriculumSignals(page)
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 8000 })
    } catch {
      /* ignore */
    }

    await bindCurriculumPanelAfterTabClick(page)
    return
  }

  console.log('[inflearn] main 에서 커리큘럼 탭 노드를 찾지 못함')
}

/**
 * 선택된 탭이 커리큘럼인지 검사 후, aria-controls 대상 패널만 스코프에 넣는다.
 * @param {import('playwright').Page} page
 */
async function bindCurriculumPanelAfterTabClick(page) {
  const result = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return { panelId: '', err: 'no-main', panelNth: -1 }
    const tabs = [...main.querySelectorAll('[role="tab"], a[role="tab"]')]
    const cur = tabs.find((t) =>
      /커리큘럼|Curriculum/i.test((t.textContent || '').trim()),
    )
    if (!cur) return { panelId: '', err: 'no-curriculum-tab', panelNth: -1 }

    const tabDomId = (cur.id || '').trim()
    if (tabDomId.includes('-tab-')) {
      const guessId = tabDomId.replace(/-tab-/, '-panel-')
      let el = document.getElementById(guessId)
      if (!el) {
        el = [...document.querySelectorAll(`[id$="-panel-curriculum"]`)].find(
          (n) => n.id.startsWith(tabDomId.split('-tab-')[0]),
        )
      }
      if (el) return { panelId: el.id, err: '', panelNth: -1 }
    }

    const allCurriculumPanels = [
      ...document.querySelectorAll('[id$="-panel-curriculum"]'),
    ]
    if (allCurriculumPanels.length === 1 && allCurriculumPanels[0].id) {
      return {
        panelId: allCurriculumPanels[0].id,
        err: '',
        panelNth: -1,
      }
    }

    const fromControls = (cur.getAttribute('aria-controls') || '')
      .trim()
      .split(/\s+/)
      .find(Boolean)
    if (fromControls) return { panelId: fromControls, err: '', panelNth: -1 }

    const tabId = (cur.id || '').trim()
    if (tabId) {
      const panels = [...main.querySelectorAll('[role="tabpanel"]')]
      const linked = panels.find(
        (p) => p.getAttribute('aria-labelledby') === tabId,
      )
      if (linked && linked.id) return { panelId: linked.id, err: '', panelNth: -1 }
      const byLabel = panels.find((p) => {
        const lb = p.getAttribute('aria-labelledby') || ''
        return lb === tabId || lb.split(/\s+/).includes(tabId)
      })
      if (byLabel && byLabel.id)
        return { panelId: byLabel.id, err: '', panelNth: -1 }
    }

    const tl =
      cur.closest('[role="tablist"]') ||
      cur.closest('[class*="mantine-Tabs-list"]') ||
      cur.closest('[class*="Tabs-list"]')
    if (tl) {
      const tabEls = [...tl.querySelectorAll('[role="tab"], a[role="tab"]')]
      const tIdx = tabEls.indexOf(cur)
      if (tIdx >= 0) {
        const panels = [...main.querySelectorAll('[role="tabpanel"]')]
        if (tIdx < panels.length) {
          const p = panels[tIdx]
          if (p.id) return { panelId: p.id, err: '', panelNth: -1 }
          return { panelId: '', err: '', panelNth: tIdx }
        }
      }
    }

    return { panelId: '', err: 'no-aria-controls', panelNth: -1 }
  })

  let fromMantine = null
  if (!result.panelId && result.panelNth < 0) {
    fromMantine = await page.evaluate(() => {
      const main = document.querySelector('main')
      if (!main) return { rootIndex: -1, panelIndex: -1 }
      const roots = [
        ...main.querySelectorAll(
          '.mantine-Tabs-root, [class*="mantine-Tabs-root"], [class*="Tabs-root"]',
        ),
      ]
      for (let ri = 0; ri < roots.length; ri += 1) {
        const root = roots[ri]
        const cur = [...root.querySelectorAll('a[role="tab"], [role="tab"]')].find(
          (t) =>
            /커리큘럼|Curriculum/i.test((t.textContent || '').trim()),
        )
        if (!cur) continue
        const tl = root.querySelector('[role="tablist"]')
        if (!tl) continue
        const tabs = [...tl.querySelectorAll('[role="tab"], a[role="tab"]')]
        const tIdx = tabs.indexOf(cur)
        if (tIdx < 0) continue
        const panels = [
          ...root.querySelectorAll(
            '.mantine-Tabs-panel, [class*="mantine-Tabs-panel"], [class*="Tabs-panel"]',
          ),
        ]
        if (tIdx < panels.length) return { rootIndex: ri, panelIndex: tIdx }
      }
      return { rootIndex: -1, panelIndex: -1 }
    })
  }

  if (
    fromMantine &&
    fromMantine.rootIndex >= 0 &&
    fromMantine.panelIndex >= 0
  ) {
    const panel = page
      .locator(
        'main .mantine-Tabs-root, main [class*="mantine-Tabs-root"], main [class*="Tabs-root"]',
      )
      .nth(fromMantine.rootIndex)
      .locator(
        '.mantine-Tabs-panel, [class*="mantine-Tabs-panel"], [class*="Tabs-panel"]',
      )
      .nth(fromMantine.panelIndex)
    setCurriculumPanelScope(panel)
    console.log(
      '[inflearn] 커리큘럼 패널 Mantine root',
      fromMantine.rootIndex,
      'panel',
      fromMantine.panelIndex,
    )
    try {
      await panel.waitFor({ state: 'visible', timeout: 8000 })
    } catch {
      /* ignore */
    }
    return
  }

  const marked = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return false
    document
      .querySelectorAll('[data-inflearn-cpanel]')
      .forEach((n) => n.removeAttribute('data-inflearn-cpanel'))

    function curriculumBlockScore(text) {
      const t = text || ''
      if (t.length < 320) return 0
      const head = t.slice(0, 2800)
      const teaserOnly =
        /관심\s*있는\s*사람|함께\s*(수강|듣는)|비슷한\s*강의/i.test(head) &&
        !/\b섹션\s*1\b|\bSection\s*1\b/.test(t) &&
        !/\d{1,3}\.\s+[^\n]{2,120}\s+\d{1,2}:\d{2}/.test(t)
      if (teaserOnly) return 0
      let s = 0
      if (/모두\s*펼치기|Expand all|전체\s*펼치기/i.test(t)) s += 55
      s += (t.match(/섹션\s*\d|Section\s*\d/g) || []).length * 12
      s += (t.match(/\d{1,3}\.\s+[^\n]+/g) || []).length * 4
      if (/\d{1,2}:\d{2}(?::\d{2})?/.test(t)) s += 25
      if (/\d{1,4}\s*개\s*·/.test(t)) s += 18
      return s
    }

    function tryMark(el) {
      if (!el) return false
      if (curriculumBlockScore(el.textContent || '') >= 55) {
        el.setAttribute('data-inflearn-cpanel', '1')
        return true
      }
      return false
    }

    const expandBtn = [
      ...main.querySelectorAll('button, a[role="button"], a'),
    ].find((b) =>
      /모두\s*펼치기|Expand all|전체\s*펼치기|Expand\s*all/i.test(
        (b.textContent || '').trim(),
      ),
    )
    if (expandBtn) {
      let el = expandBtn.parentElement
      for (let d = 0; d < 18 && el; d += 1) {
        if (tryMark(el)) return true
        el = el.parentElement
      }
    }

    const cur = [...main.querySelectorAll('a[role="tab"], [role="tab"]')].find(
      (t) => /커리큘럼|Curriculum/i.test((t.textContent || '').trim()),
    )
    const tablist = cur?.closest('[role="tablist"]')
    if (!tablist?.parentElement) return false

    const candidates = []
    const parent = tablist.parentElement
    const kids = [...parent.children]
    const li = kids.indexOf(tablist)
    for (let j = li + 1; j < kids.length; j += 1) {
      candidates.push(kids[j])
    }

    const root =
      tablist.closest('[class*="Tabs-root"]') ||
      tablist.closest('.mantine-Tabs-root')
    if (root) {
      for (const div of root.querySelectorAll('div')) {
        if (tablist.contains(div)) continue
        if ((div.textContent || '').length > 800) candidates.push(div)
      }
    }

    let best = null
    let bestScore = 0
    for (const el of candidates) {
      const sc = curriculumBlockScore(el.textContent || '')
      if (sc > bestScore) {
        bestScore = sc
        best = el
      }
    }
    if (best && bestScore >= 55) {
      best.setAttribute('data-inflearn-cpanel', '1')
      return true
    }
    return false
  })

  if (marked) {
    const panel = page.locator('[data-inflearn-cpanel="1"]').first()
    setCurriculumPanelScope(panel)
    console.log('[inflearn] 커리큘럼 영역 마킹 후 추출 (인프런 Mantine Tabs 용)')
    try {
      await panel.waitFor({ state: 'visible', timeout: 6000 })
    } catch {
      /* ignore */
    }
    return
  }

  if (result.panelId) {
    const safe = result.panelId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const panel = page.locator(`[id="${safe}"]`).first()
    try {
      await panel.waitFor({ state: 'visible', timeout: 8000 })
    } catch {
      /* 숨김 패널일 수 있음 — 스크래핑은 DOM 에서 시도 */
    }
    setCurriculumPanelScope(panel)
    console.log('[inflearn] 커리큘럼 패널 바인딩 id=', result.panelId)
    return
  }

  if (result.panelNth >= 0) {
    const panel = page.locator('main [role="tabpanel"]').nth(result.panelNth)
    setCurriculumPanelScope(panel)
    console.log('[inflearn] 커리큘럼 패널 바인딩 nth=', result.panelNth)
    try {
      await panel.waitFor({ state: 'visible', timeout: 8000 })
    } catch {
      /* ignore */
    }
    return
  }

  console.warn(
    '[inflearn] 커리큘럼 패널 id 미확인 — 보조 탐색',
    result.err || '',
  )
  await bindCurriculumPanelHeuristic(page)
}

/**
 * @param {import('playwright').Page} page
 */
async function bindCurriculumPanelHeuristic(page) {
  const idx = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return -1
    const panels = [...main.querySelectorAll('[role="tabpanel"]')]
    for (let i = 0; i < panels.length; i += 1) {
      const p = panels[i]
      if (p.getAttribute('hidden') != null) continue
      const st = window.getComputedStyle(p)
      if (st.display === 'none' || st.visibility === 'hidden') continue
      const t = ((p.textContent || '') + ' ').slice(0, 3500)
      if (
        /수강평|Reviews\b/i.test(t) &&
        /^\s*(수강평|Reviews)/i.test((p.textContent || '').trim())
      ) {
        continue
      }
      if (
        /모두\s*펼치기|Expand all|전체\s*펼|섹션\s*\d|Section\s*\d/.test(t)
      ) {
        return i
      }
    }
    return -1
  })

  if (idx >= 0) {
    const panel = page
      .locator('main [role="tabpanel"]')
      .nth(idx)
    setCurriculumPanelScope(panel)
    console.log('[inflearn] 커리큘럼 패널 휴리스틱 index=', idx)
    return
  }

  setCurriculumPanelScope(null)
  console.warn('[inflearn] 커리큘럼 패널을 특정하지 못함')
}

/**
 * 커리큘럼 본문 스코프: 반드시 활성 커리큘럼 tabpanel (전역 :visible 첫 패널 사용 안 함).
 * @param {import('playwright').Page} page
 * @returns {Promise<import('playwright').Locator>}
 */
async function resolveCurriculumScope(page) {
  const fixed = getCurriculumPanelScope()
  if (
    fixed &&
    (await fixed.count()) > 0 &&
    (await fixed.isVisible({ timeout: 800 }).catch(() => false))
  ) {
    return fixed
  }

  console.warn('[inflearn] 고정 패널 없음 — 휴리스틱 재바인딩')
  await bindCurriculumPanelHeuristic(page)
  const again = getCurriculumPanelScope()
  if (
    again &&
    (await again.count()) > 0 &&
    (await again.isVisible({ timeout: 500 }).catch(() => false))
  ) {
    return again
  }

  return page.locator('main').first()
}

/**
 * 인프런 커리큘럼 "모두 펼치기" / Expand all (있으면 한 번에 펼침)
 * @param {import('playwright').Page} page
 */
async function clickCurriculumExpandAll(page) {
  const scope = await resolveCurriculumScope(page)
  const candidates = [
    scope.getByRole('button', { name: /^모두\s*펼치기$/ }),
    scope.getByRole('button', { name: /모두\s*펼|전체\s*펼|펼치기\s*전체/i }),
    scope.getByRole('button', { name: /^Expand all$/i }),
    scope.getByRole('button', { name: /Expand all/i }),
    scope.getByRole('link', { name: /Expand all|모두\s*펼/i }),
  ]
  for (const loc of candidates) {
    try {
      const b = loc.first()
      if (await b.isVisible({ timeout: 1200 }).catch(() => false)) {
        console.log('[inflearn] 모두 펼치기(Expand all) 클릭')
        await b.click({ timeout: 4000, force: true })
        await page.waitForTimeout(600)
        return
      }
    } catch {
      /* try next */
    }
  }
}

/**
 * main 안의 커리큘럼 아코디언만 펼침 (상단 강의소개·수강평 탭 버튼은 제외)
 * @param {import('playwright').Page} page
 * @param {{ maxRounds?: number }} [opts]
 */
async function expandCurriculumAccordions(page, opts = {}) {
  const maxRounds = opts.maxRounds ?? 28
  const scope = await resolveCurriculumScope(page)
  if ((await scope.count()) === 0) return

  const skipLabel =
    /강의\s*소개|수강평|커뮤니티|새소식|수강전\s*문의|Course intro|Introduction|Reviews|Community|News/i

  for (let round = 0; round < maxRounds; round += 1) {
    let clicked = 0
    const collapsed = scope.locator(
      '[aria-expanded="false"]:visible, button[aria-expanded="false"]:visible',
    )
    const n = await collapsed.count()
    for (let i = 0; i < n; i += 1) {
      const el = collapsed.nth(i)
      try {
        if (!(await el.isVisible().catch(() => false))) continue
        const label = (await el.innerText().catch(() => '')) || ''
        const aria = (await el.getAttribute('aria-label').catch(() => '')) || ''
        const combined = `${label} ${aria}`
        if (skipLabel.test(combined)) continue
        if (combined.length > 180) continue
        await el.click({ timeout: 600, force: true })
        clicked += 1
      } catch {
        /* ignore */
      }
    }
    if (clicked === 0) break
    await page.waitForTimeout(350)
  }
}

/**
 * 페이지 하단으로 스크롤해 지연 로딩을 유도합니다.
 * @param {import('playwright').Page} page
 */
async function scrollForLazyLoad(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.85))
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < 18; i += 1) {
        window.scrollBy(0, step)
        await new Promise((r) => {
          setTimeout(r, 120)
        })
      }
      window.scrollTo(0, 0)
      await new Promise((r) => {
        setTimeout(r, 200)
      })
    }
  })
  await page.waitForTimeout(400)
}

/**
 * 로그인 필요 여부(휴리스틱)
 * @param {import('playwright').Page} page
 */
async function detectLoginRequired(page) {
  const url = page.url()
  if (/\/login|\/signin|accounts\.inflearn/i.test(url)) {
    return true
  }
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || ''
  if (
    /로그인이 필요|로그인 후|회원만 이용|로그인해 주세요/i.test(bodyText) &&
    bodyText.length < 8000
  ) {
    return true
  }
  const pw = page.locator('input[type="password"]')
  if ((await pw.count()) > 0) {
    const loginHint = page.getByRole('link', { name: /로그인/i })
    if ((await loginHint.count()) > 0) return true
  }
  return false
}

/**
 * main 영역만 대상으로 커리큘럼 행 추출 (수강평·댓글의 "3.5" 등 노이즈 제거)
 * @param {import('playwright').Page} page
 */
async function extractCurriculumRaw(page) {
  const scoped = getCurriculumPanelScope()
  let container = scoped
  if (
    !container ||
    (await container.count()) === 0 ||
    !(await container.isVisible({ timeout: 600 }).catch(() => false))
  ) {
    await bindCurriculumPanelHeuristic(page)
    container = getCurriculumPanelScope()
  }
  if (
    !container ||
    (await container.count()) === 0 ||
    !(await container.isVisible({ timeout: 600 }).catch(() => false))
  ) {
    console.warn('[inflearn] 추출 스코프 없음 — main 폴백(비권장)')
    container = page.locator('main').first()
  }

  return container.evaluate((root) => {
    const rows = []
    let currentSection = ''
    const seen = new Set()

    function isLikelyLessonLine(line, section) {
      const t = line.trim()
      if (!t || t.length > 280) return false
      if (!/^\d{1,4}\.\s+/.test(t)) return false
      if (/^\d\.\d+$/.test(t)) return false
      const hasTime = /\d{1,2}:\d{2}(?::\d{2})?\s*$/.test(t)
      if (hasTime) return true
      if (
        /전혀\s*접하지|이해하기\s*쉽|감사합니다|추천합니다|도움됐|합격했|퇴근후|딴짓님|선생님께/i.test(
          t,
        )
      ) {
        return false
      }
      const lineDoc = /(\(문서|\(Materials Only\)|\(Data Only\)|only\s*자료|문서\s*만|Materials Only|Data Only|\(자료\s*만\)|미리보기)/i.test(
        t,
      )
      if (lineDoc) return true
      if (!section) return false
      if (/(문서|자료|연습|과제|퀴즈|실습|챌린지)/.test(section)) return true
      if (
        /Document Materials|Document-only|Materials\s*only|데이터\s*만|자료\s*전용/i.test(
          section,
        )
      ) {
        return true
      }
      return false
    }

    /**
     * @param {Element} el
     */
    function iconHintFrom(el) {
      const icons = el.querySelectorAll('svg[aria-label], img[alt]')
      const parts = []
      icons.forEach((node) => {
        const label =
          node.getAttribute('aria-label') ||
          node.getAttribute('alt') ||
          ''
        const s = label.trim()
        if (s && s.length < 80) parts.push(s)
      })
      return parts.join(' ')
    }

    if (!root) return { rows: [] }

    /** 탭은 제외하고, 본문에 나오는 '수강평' 제목 이후는 세로 레이아웃에서 후기 목록이 섞이지 않게 건너뜀 */
    let reviewSentinel = null
    for (const h of root.querySelectorAll('h2, h3, h4')) {
      if (h.closest('[role="tablist"]')) continue
      const tx = (h.textContent || '').replace(/\s+/g, ' ').trim()
      if (/^수강평(\s|$|\(|:|\d)/.test(tx) || /^Reviews(\s|$|\(|:|\d)/i.test(tx)) {
        reviewSentinel = h
        break
      }
    }

    function isPastReviewSection(el) {
      if (!reviewSentinel) return false
      const pos = el.compareDocumentPosition(reviewSentinel)
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return true
      return false
    }

    const ordered = root.querySelectorAll(
      [
        'button[aria-expanded]',
        '[role="button"][aria-expanded]',
        'li',
        '[role="listitem"]',
        'tr',
        'h2',
        'h3',
        'h4',
        'h5',
        'section',
      ].join(', '),
    )

    ordered.forEach((el) => {
      if (isPastReviewSection(el)) return
      const lines = (el.innerText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (!lines.length) return

      for (const line of lines) {
        if (line.length > 500) continue
        if (/^(?:섹션|section)\s*\d+/i.test(line) && line.length < 320) {
          currentSection = line
          continue
        }
        if (!isLikelyLessonLine(line, currentSection)) continue
        const key = `${currentSection}|||${line}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          rawLine: line,
          sectionTitle: currentSection,
          iconLabel: iconHintFrom(el),
        })
      }

      const glued = lines.join(' ').replace(/\s+/g, ' ').trim()
      if (
        glued.length > 0 &&
        glued.length < 400 &&
        /^\d{1,4}\.\s+/.test(glued) &&
        isLikelyLessonLine(glued, currentSection)
      ) {
        const key = `${currentSection}|||${glued}`
        if (!seen.has(key)) {
          seen.add(key)
          rows.push({
            rawLine: glued,
            sectionTitle: currentSection,
            iconLabel: iconHintFrom(el),
          })
        }
      }
    })

    if (rows.length === 0) {
      let raw = (root.innerText || '').split('\n').map((l) => l.trim())
      if (reviewSentinel) {
        const joined = raw.join('\n')
        const cut = joined.search(/\n수강평(?:\s|$|\(|:|\d)/)
        if (cut !== -1) {
          raw = joined.slice(0, cut).split('\n').map((l) => l.trim())
        }
      }
      const plainLines = raw.filter(Boolean)

      let sec = ''
      for (const line of plainLines) {
        if (/^(?:섹션|section)\s*\d+/i.test(line) && line.length < 320) {
          sec = line
          continue
        }
        if (!isLikelyLessonLine(line, sec)) continue
        const key = `${sec}|||${line}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({ rawLine: line, sectionTitle: sec, iconLabel: '' })
      }
    }

    return { rows }
  })
}

/**
 * @param {object} row
 * @param {string} sourceUrl
 */
function rowToItem(row, sourceUrl) {
  const { cleanTitle, durationText } = extractDurationFromLineEnd(row.rawLine)
  const title = normalizeTitle(cleanTitle)
  const sectionTitle = normalizeTitle(row.sectionTitle || '')
  const iconLabel = normalizeTitle(row.iconLabel || '')

  let contentType = detectContentType({
    title,
    durationText,
    sectionTitle,
    iconLabel,
  })

  let seconds = parseDurationTextToSeconds(durationText)
  if (contentType === 'video' && seconds <= 0) {
    contentType = 'unknown'
  }
  if (contentType !== 'video') {
    seconds = 0
  }

  return {
    title,
    durationText:
      durationText && parseDurationTextToSeconds(durationText) > 0
        ? durationText
        : null,
    durationSeconds: seconds,
    contentType,
    sectionTitle,
    source: 'inflearn',
    sourceUrl,
  }
}

/**
 * 1단계: 커리큘럼 패널에 들어가고, 항목 목록이 DOM에 올라오도록 준비한다.
 * @param {import('playwright').Page} page
 */
async function prepareCurriculumPanelForScrape(page) {
  await dismissInflearnModals(page)
  await activateCurriculumTab(page)
  await dismissInflearnModals(page)

  try {
    await page.waitForSelector('main', { timeout: 15000 })
  } catch {
    /* ignore */
  }

  const scope = getCurriculumPanelScope()
  if (!scope || (await scope.count()) === 0) {
    const err = new Error(
      '커리큘럼 패널을 찾지 못했습니다. 페이지에서 "커리큘럼" 탭이 보이는지 확인해 주세요.',
    )
    err.code = 'CURRICULUM_PANEL_NOT_FOUND'
    throw err
  }
  if (!(await scope.isVisible({ timeout: 1200 }).catch(() => false))) {
    console.warn(
      '[inflearn] 커리큘럼 패널이 보이지 않음 — DOM 추출만 시도합니다',
    )
  }

  await clickCurriculumExpandAll(page)
  await expandCurriculumAccordions(page, { maxRounds: 22 })
  await scrollForLazyLoad(page)
  await dismissInflearnModals(page)
  await clickCurriculumExpandAll(page)
  await expandCurriculumAccordions(page, { maxRounds: 22 })
}

/**
 * 2단계: 커리큘럼 패널에서 목차·시간을 읽어 앱 import 형식으로 만든다.
 * @param {import('playwright').Page} page
 * @param {string} sourceUrl
 */
async function scrapeCurriculumIntoAppShape(page, sourceUrl) {
  const { rows } = await extractCurriculumRaw(page)
  console.log('[inflearn] raw rows:', rows?.length ?? 0)
  if (rows?.length) {
    console.log('[inflearn] sample:', rows.slice(0, 3).map((r) => r.rawLine))
  }

  if (!rows || rows.length === 0) {
    const err = new Error(
      '커리큘럼을 찾지 못했습니다. 대시보드 URL인지 확인하고, 뜬 브라우저에서 "커리큘럼" 탭과 로그인 상태를 확인해주세요.',
    )
    err.code = 'CURRICULUM_NOT_FOUND'
    throw err
  }

  const flatItems = rows.map((r) => rowToItem(r, sourceUrl))

  /** @type {Map<string, { sectionTitle: string, items: object[] }>} */
  const sectionMap = new Map()
  for (const it of flatItems) {
    const key = it.sectionTitle || '(섹션 미지정)'
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { sectionTitle: key, items: [] })
    }
    sectionMap.get(key).items.push(it)
  }

  const sections = [...sectionMap.values()]

  let courseTitle = ''
  try {
    const h1 = await page.locator('main h1').first().innerText({ timeout: 4000 })
    courseTitle = normalizeTitle(h1)
  } catch {
    try {
      const h1 = await page.locator('h1').first().innerText({ timeout: 2000 })
      courseTitle = normalizeTitle(h1)
    } catch {
      courseTitle = ''
    }
  }
  if (!courseTitle) {
    const t = (await page.title().catch(() => '')) || '인프런 강의'
    courseTitle = normalizeTitle(t.replace(/\s*\|\s*인프런.*$/i, ''))
  }

  let videoCount = 0
  let documentCount = 0
  let assignmentCount = 0
  let unknownCount = 0
  let totalVideoSeconds = 0

  for (const it of flatItems) {
    if (it.contentType === 'video') {
      videoCount += 1
      totalVideoSeconds += it.durationSeconds || 0
    } else if (it.contentType === 'document') documentCount += 1
    else if (it.contentType === 'assignment') assignmentCount += 1
    else unknownCount += 1
  }

  const summary = {
    totalItems: flatItems.length,
    videoCount,
    documentCount,
    assignmentCount,
    unknownCount,
    totalVideoSeconds,
  }

  console.log('[inflearn] summary:', summary)

  if (videoCount === 0 && unknownCount > 50) {
    console.warn(
      '[inflearn] 영상 0·unknown 다수 — 커리큘럼 탭·모달·펼침 상태를 점검하세요.',
    )
  }

  return {
    courseTitle,
    sections,
    flatItems,
    summary,
  }
}

/**
 * 대시보드 URL로 접속한 뒤, (1) 커리큘럼 패널 준비 → (2) 목차·시간 스크래핑까지 한 번에 수행한다.
 * @param {string} url
 * @param {{ headless?: boolean }} [opts]
 */
export async function crawlInflearnCourse(url, opts = {}) {
  const headless = opts.headless === true
  const parsed = assertInflearnDashboardUrl(url)
  if (!parsed.ok) {
    const err = new Error(parsed.message)
    err.code = 'INVALID_URL'
    throw err
  }
  const dashboardUrl = parsed.url

  let context
  try {
    const execPath = resolveChromiumExecutable()
    if (!execPath) {
      const err = new Error(
        '프로젝트에 Chromium이 설치되어 있지 않습니다. 프로젝트 루트에서 npm run setup:playwright 를 실행하세요.',
      )
      err.code = 'PLAYWRIGHT_FAILED'
      throw err
    }
    const { chromium } = await import('playwright')
    context = await chromium.launchPersistentContext(INFLEARN_USER_DATA_DIR, {
      headless,
      viewport: { width: 1280, height: 900 },
      locale: 'ko-KR',
      executablePath: execPath,
    })
  } catch (e) {
    const err = new Error(
      `Playwright Chromium을 찾을 수 없습니다. 프로젝트 루트에서 다음을 실행하세요: npm run setup:playwright (또는 npx playwright install chromium). 상세: ${e?.message || e}`,
    )
    err.code = 'PLAYWRIGHT_FAILED'
    err.cause = e
    throw err
  }

  const page = await context.newPage()
  clearCurriculumPanelScope()

  try {
    await page.goto(dashboardUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    })

    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 })
    } catch {
      /* ignore */
    }

    if (await detectLoginRequired(page)) {
      const err = new Error(
        '로그인이 필요한 페이지입니다. 서버가 연 브라우저 창에서 인프런에 로그인한 뒤 다시 시도해주세요.',
      )
      err.code = 'LOGIN_REQUIRED'
      throw err
    }

    await prepareCurriculumPanelForScrape(page)
    return await scrapeCurriculumIntoAppShape(page, dashboardUrl)
  } catch (e) {
    if (e.code) throw e
    const err = new Error(`페이지 처리 실패: ${e?.message || e}`)
    err.code = 'PAGE_FAILED'
    err.cause = e
    throw err
  } finally {
    await page.evaluate(() => {
      document
        .querySelectorAll('[data-inflearn-cpanel]')
        .forEach((n) => n.removeAttribute('data-inflearn-cpanel'))
    }).catch(() => {})
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
}
