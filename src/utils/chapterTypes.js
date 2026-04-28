/**
 * 스케줄·영상 시간 합산에 포함할 챕터 여부.
 * contentType이 없으면 기존 데이터 호환을 위해 영상으로 취급합니다.
 * @param {object | null | undefined} c
 * @returns {boolean}
 */
export function isVideoChapter(c) {
  if (!c || typeof c !== 'object') return false
  const t = c.contentType
  if (t == null || t === '' || t === 'video') return true
  return false
}

export const CONTENT_TYPE_LABELS = {
  video: '영상',
  document: '자료',
  assignment: '과제',
  unknown: '확인 필요',
}
