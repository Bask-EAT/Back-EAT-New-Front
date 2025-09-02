// 백엔드 API의 공통 응답 형식
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

// 백엔드로부터 받는 북마크 데이터 타입
export interface Bookmark {
    id: string; // 레시피 ID와 동일
    userId: string;
    timestamp: number;
    recipeData: RecipeData; // 북마크 시 저장된 레시피 데이터
}

// 레시피 데이터 타입
export interface RecipeData {
    id: string;
    recipeName: string;
    recipeDescription?: string;
    // ... 기타 레시피 관련 필드들
}

// --- API 호출 헬퍼 함수 ---

// fetch를 감싸서 인증 헤더와 에러 처리를 자동화합니다.
async function fetchWithAuth<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const token = localStorage.getItem("jwtToken");
    // --- 디버깅용 코드 ---
    // console.log("🔍 [fetchWithAuth] localStorage에서 가져온 토큰:", token);
    // -------------------
    if (!token) {
        console.error(
            "❌ [fetchWithAuth] 인증 토큰을 찾을 수 없습니다. 로그인 상태를 확인해주세요."
        );
        throw new Error("Unauthorized");
    }

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const errorData = await response
            .json()
            .catch(() => ({ message: "응답 파싱 오류" }));
        throw new Error(
            errorData.message || `HTTP 에러! 상태: ${response.status}`
        );
    }
    return response.json() as Promise<T>;
}

// --- 북마크 API 함수들 ---

/** 사용자의 모든 북마크 조회 */
export async function getUserBookmarks(): Promise<ApiResponse<Bookmark[]>> {
    console.log("✅ [API 서비스] /api/bookmarks GET 요청 시작");
    try {
        const response = await fetchWithAuth<ApiResponse<Bookmark[]>>(
            "/api/bookmarks"
        );
        console.log("  - [API 서비스] GET 응답 수신:", response);
        if (response.success) {
            console.log(
                `  - 성공: 북마크 ${response.data?.length ?? 0}개 수신`
            );
        } else {
            console.warn("  - API 응답 오류:", response.message);
        }
        return response;
    } catch (error) {
        console.error(
            "❌ [API 서비스] getUserBookmarks 호출 중 심각한 오류 발생",
            error
        );
        return { success: false, message: (error as Error).message };
    }
}

/** 레시피 북마크 추가 */
export async function addBookmark(recipe: RecipeData): Promise<ApiResponse> {
    console.log(
        `✅ [API 서비스] /api/bookmarks POST 요청 시작 (레시피 ID: ${recipe.id})`
    );
    try {
        const response = await fetchWithAuth<ApiResponse>("/api/bookmarks", {
            method: "POST",
            body: JSON.stringify(recipe),
        });
        // --- ✨ 디버깅 코드 추가 ---
        console.log("📥 [API 서비스] addBookmark 서버 응답 수신:", response);
        // -------------------------

        return response;
        
    } catch (error) {
        console.error(
            "❌ [API 서비스] addBookmark 호출 중 심각한 오류 발생",
            error
        );
        return { success: false, message: (error as Error).message };
    }
}

/** 레시피 북마크 제거 */
export async function removeBookmark(recipeId: string): Promise<ApiResponse> {
    console.log(`✅ [API 서비스] /api/bookmarks/${recipeId} DELETE 요청 시작`);
    try {
        return await fetchWithAuth<ApiResponse>(`/api/bookmarks/${recipeId}`, {
            method: "DELETE",
        });
    } catch (error) {
        console.error(
            "❌ [API 서비스] removeBookmark 호출 중 심각한 오류 발생",
            error
        );
        return { success: false, message: (error as Error).message };
    }
}
