import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8080";


/** 공통 에러 핸들러 */
function handleError(error: unknown, apiName: string) {    
    console.error(`🚨 [API Route:${apiName}] 에러 발생:`, error instanceof Error ? error.message : String(error))
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 서버 오류가 발생했습니다."
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 })
}


/** GET /api/bookmarks - 사용자의 모든 북마크 조회 */
export async function GET(req: NextRequest) {
  console.log("✅ [API Route] GET /api/bookmarks 요청 수신");
  try {
      // Authorization 헤더 확인
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
          return NextResponse.json(
              { success: false, message: "인증 헤더가 없습니다." },
              { status: 401 }
          );
      }

      // 2. "Bearer " 부분을 제거하여 순수한 토큰 값만 추출합니다. (원래 방식)
      const token = authHeader.replace("Bearer ", "");
    
      console.log("  - 백엔드로 북마크 목록 요청을 전달합니다.");
      const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
          method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const data = await response.json();
    
      console.log(`  - 백엔드 응답 수신 (상태 코드: ${response.status})`);
      return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("🚨 [API Route:GET] 에러 발생:", error);
    return NextResponse.json(
        { success: false, message: "서버 오류가 발생했습니다." },
        { status: 500 }
    );
  }
}


/** POST /api/bookmarks - 북마크 추가 */
export async function POST(req: NextRequest) {
  console.log("✅ [API Route] POST /api/bookmarks 요청 수신");
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
       return NextResponse.json(
           { success: false, message: "인증 헤더가 없습니다." },
           { status: 401 }
       );
    }

    const body = await req.json();
    console.log("  - 백엔드로 북마크 추가 요청을 전달합니다. (본문 포함)");
    const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
        method: "POST",
        headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log(`  - 백엔드 응답 수신 (상태 코드: ${response.status})`);
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    return handleError(error, "POST");
  }
}

/** DELETE /api/bookmarks/[recipeId] - 북마크 제거 */
export async function DELETE(req: NextRequest, { params }: { params: { slug: string[] } }) {
    console.log("✅ [API Route] DELETE /api/bookmarks/[recipeId] 요청 수신");
    try {
        const recipeId = params.slug?.[0];
        if (!recipeId) {
            return NextResponse.json({ success: false, message: "레시피 ID가 필요합니다." }, { status: 400 });
        }

        const authHeader = req.headers.get("authorization")
        if (!authHeader) {
            return NextResponse.json({ success: false, message: "인증 헤더가 없습니다." }, { status: 401 })
        }

        console.log(`  - 백엔드로 북마크 제거 요청을 전달합니다. (Recipe ID: ${recipeId})`);
        const response = await fetch(`${BACKEND_URL}/api/bookmarks/${recipeId}`, {
            method: "DELETE",
            headers: { "Authorization": authHeader },
        })

        const data = await response.json();
        console.log(`  - 백엔드 응답 수신 (상태 코드: ${response.status})`);
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return handleError(error, "DELETE");
    }
}