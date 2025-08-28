import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 환경 체크
const isBrowser = typeof window !== "undefined"

// 로컬에 고정 사용자 ID 저장/조회
export function getOrCreateUserId(storageKey: string = "app_user_id"): string {
  if (!isBrowser) return "anonymous-server"
  try {
    const existing = window.localStorage.getItem(storageKey)
    if (existing && existing.trim()) return existing
    const newId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    window.localStorage.setItem(storageKey, newId)
    return newId
  } catch {
    return `${Date.now()}-guest`
  }
}

// 타임스탬프+UserID 조합을 SHA-256 해시로 변환
export async function generateChatIdForUser(userId: string, timestamp?: number): Promise<string> {
  const ts = String(timestamp ?? Date.now())
  const raw = `${ts}-${userId}`
  // 브라우저 Web Crypto API 사용
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    const enc = new TextEncoder()
    const data = enc.encode(raw)
    const digest = await crypto.subtle.digest("SHA-256", data)
    const bytes = new Uint8Array(digest)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
  }
  // 폴백: 간단한 해시 (충돌 가능성 높음 - 임시용)
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return `fallback-${ts}-${Math.abs(hash)}`
}
