/**
 * Node가 다른 모듈을 로드하기 전에 실행되도록 --import 로만 불립니다.
 */
import { ensurePlaywrightBrowsersPath } from './playwright-paths.js'

ensurePlaywrightBrowsersPath()
