/** 빈 값이면 상대 경로(개발 시 Vite `/api` 프록시). 프로덕션은 VITE_API_BASE_URL 설정. */
export function apiUrl(path) {
  const raw = import.meta.env.VITE_API_BASE_URL
  const base =
    typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
