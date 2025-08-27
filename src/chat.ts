import type { ChatMessage } from "./types"

// 메시지 타입 가드 함수
function isUserMessage(message: ChatMessage): boolean {
  return message.role === "user" || message.type === "user"
}

// 메시지 배열을 받아 제목을 생성하는 순수 로직
export const updateChatTitle = (messages: ChatMessage[]) => {
  if (messages.length > 0) {
    const firstUserMessage = messages.find(isUserMessage)
    if (firstUserMessage) {
      const title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
      return title
    }
  }
  return "New Chat"
}

// 입력 문자열이 숫자인지 확인하는 로직.
export function isNumericSelection(input: string): boolean {
    const text = (input || "").trim()
    if (!/\d/.test(text)) return false
    // 허용: 숫자/공백/콤마/한글 '번'
    return /^([0-9]+\s*(번)?\s*[,\s]?)+$/.test(text)
  }

// 숫자 선택을 요리 이름으로 매핑하는 로직
export function mapSelectionToDish(input: string, suggestions: string[]): string | null {
    const indices = (input.match(/\d+/g) || []).map((s) => parseInt(s, 10)).filter((n) => n >= 1)
    for (const n of indices) {
      const idx = n - 1
      if (idx >= 0 && idx < suggestions.length) return suggestions[idx]
    }
    return null
  }

// 텍스트에서 번호가 매겨진 제안 목록을 추출하는 로직.
export function extractNumberedSuggestions(text: string): string[] {
    if (!text) return []
    const lines = text.split(/\r?\n/)
    const out: string[] = []
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/)
      if (m) {
        const name = m[2].split(" — ")[0].trim()
        if (name) out.push(name)
      }
    }
    return out
  }