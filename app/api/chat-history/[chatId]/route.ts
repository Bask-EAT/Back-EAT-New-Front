import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.replace("Bearer ", "")

    const { chatId } = params

    // 백엔드 서버에서 특정 채팅의 메시지 가져오기
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"
    const response = await fetch(`${BACKEND_URL}/api/chat/history/${chatId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch chat: ${response.status}`)
    }

    const chat = await response.json()
    return NextResponse.json(chat)
  } catch (error) {
    console.error("Chat history API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    )
  }
}
