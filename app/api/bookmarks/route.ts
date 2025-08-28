import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.replace("Bearer ", "")

    // 백엔드 서버에서 북마크 가져오기
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"
    const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch bookmarks: ${response.status}`)
    }

    const bookmarks = await response.json()
    return NextResponse.json(bookmarks)
  } catch (error) {
    console.error("Bookmarks API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.replace("Bearer ", "")

    const { recipeId, action } = await req.json() // action: "add" | "remove"

    // 백엔드 서버에 북마크 추가/제거 요청
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"
    const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipeId, action }),
    })

    if (!response.ok) {
      throw new Error(`Failed to ${action} bookmark: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Bookmark API error:", error)
    return NextResponse.json(
      { error: `Failed to process bookmark request` },
      { status: 500 }
    )
  }
}
