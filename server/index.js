import './register-playwright-path.js'
import express from 'express'
import cors from 'cors'
import {
  crawlInflearnCourse,
  assertInflearnDashboardUrl,
} from './crawlers/inflearnCrawler.js'

const PORT = Number(process.env.PORT) || 4000
/** 로컬 개발: 기본 0(비활성). 제한 켜려면 INFLEARN_RATE_LIMIT_MS=45000 */
const MIN_INTERVAL_MS = Math.max(
  0,
  Number(process.env.INFLEARN_RATE_LIMIT_MS ?? 0),
)

/** 동일 URL 성공 직후만 간격 제한 (실패 직후 재시도는 막지 않음) */
const lastSuccessfulCrawlAtByUrl = new Map()

const app = express()
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }),
)
app.use(express.json({ limit: '24kb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    /** 클라이언트에서 새 서버인지 확인용(구 서버는 필드 없음) */
    capabilities: { inflearnPublicCourseToDashboard: true },
  })
})

app.post('/api/import/inflearn', async (req, res) => {
  const url = req.body?.url
  if (url == null || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({
      error: true,
      code: 'EMPTY_URL',
      message: 'URL이 비어 있습니다.',
    })
  }

  const trimmed = url.trim()
  const urlCheck = assertInflearnDashboardUrl(trimmed)
  if (!urlCheck.ok) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_URL',
      message: urlCheck.message,
    })
  }

  const crawlUrl = urlCheck.url

  if (MIN_INTERVAL_MS > 0) {
    const now = Date.now()
    const lastOkForThisUrl = lastSuccessfulCrawlAtByUrl.get(crawlUrl) || 0
    if (now - lastOkForThisUrl < MIN_INTERVAL_MS) {
      return res.status(429).json({
        error: true,
        code: 'RATE_LIMIT',
        message: `같은 강의 URL은 성공 직후 ${Math.ceil(MIN_INTERVAL_MS / 1000)}초 안에 다시 요청할 수 없습니다.`,
      })
    }
  }

  const headless = process.env.INFLEARN_HEADLESS === '1'

  try {
    const data = await crawlInflearnCourse(crawlUrl, { headless })
    if (!data?.flatItems?.length) {
      return res.status(404).json({
        error: true,
        code: 'EMPTY_RESULT',
        message: '가져온 커리큘럼 항목이 없습니다.',
      })
    }
    if (MIN_INTERVAL_MS > 0) {
      lastSuccessfulCrawlAtByUrl.set(crawlUrl, Date.now())
    }
    return res.json(data)
  } catch (e) {
    const code = e.code || 'UNKNOWN'
    console.error('[POST /api/import/inflearn]', code, e.message)

    const map = {
      INVALID_URL: 400,
      LOGIN_REQUIRED: 401,
      CURRICULUM_NOT_FOUND: 404,
      CURRICULUM_PANEL_NOT_FOUND: 404,
      EMPTY_RESULT: 404,
      RATE_LIMIT: 429,
      PLAYWRIGHT_FAILED: 500,
      PAGE_FAILED: 502,
    }
    const status = map[code] ?? 500

    return res.status(status).json({
      error: true,
      code,
      message: e.message || '인프런 목차 가져오기에 실패했습니다.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
  console.log(
    '[server] 인프런: /course/슬러그(소개·#curriculum) URL은 자동으로 …/dashboard 로 변환합니다.',
  )
})
