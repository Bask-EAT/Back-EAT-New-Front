import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.replace("Bearer ", "")

    // 백엔드 서버에서 채팅 기록 가져오기
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"
    const response = await fetch(`${BACKEND_URL}/api/chat/history`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.status}`)
    }

    const chatHistory = await response.json()
    return NextResponse.json(chatHistory)
  } catch (error) {
    console.error("Chat history API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}
