/**
 * 단일 URL 인프런 커리큘럼 검증용 (로그인 프로필: server/.auth/inflearn-user-data)
 * Usage: node --import ./server/register-playwright-path.js ./server/scripts/test-inflearn-one.mjs [url]
 */
import { crawlInflearnCourse } from '../crawlers/inflearnCrawler.js'

const url =
  process.argv[2] ||
  'https://www.inflearn.com/course/%EB%B9%85%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%B6%84%EC%84%9D%EA%B8%B0%EC%82%AC-%EC%8B%A4%EA%B8%B0/dashboard?cid=329972'

const EXPECT_ITEMS = 109
const EXPECT_VIDEO_SEC = 23 * 3600 + 51 * 60

try {
  const d = await crawlInflearnCourse(url, { headless: true })
  const s = d.summary
  const secSum = d.flatItems.reduce((a, x) => a + (x.durationSeconds || 0), 0)
  console.log('courseTitle', d.courseTitle)
  console.log('summary', s)
  console.log('sections', d.sections.length, 'flatItems', d.flatItems.length)
  console.log('sum(durationSeconds)', secSum, `expected ~${EXPECT_VIDEO_SEC}`)
  if (s.totalItems !== EXPECT_ITEMS) {
    console.warn(
      `[check] totalItems ${s.totalItems} (기대 ${EXPECT_ITEMS}, 차이 ${s.totalItems - EXPECT_ITEMS})`,
    )
  }
  if (Math.abs(secSum - EXPECT_VIDEO_SEC) > 120) {
    console.warn(
      `[check] 영상 합계 초 ${secSum} (기대 ${EXPECT_VIDEO_SEC}, 차이 ${secSum - EXPECT_VIDEO_SEC})`,
    )
  }
} catch (e) {
  console.error('FAILED', e.code || '', e.message)
  process.exitCode = 1
}
