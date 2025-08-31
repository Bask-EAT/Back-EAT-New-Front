"use client"

import {getAuthHeaders} from "@/lib/auth"

const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(init.headers || {}),
        ...getAuthHeaders(),
    }

    const res = await fetch(`${BASE}${path}`, {...init, headers, credentials: "include"})

    if (res.status === 401) {
        try {
            localStorage.removeItem("jwtToken")
        } catch {
        }
        if (typeof window !== "undefined") {
            try {
                window.location.href = "/"
            } catch {
            }
        }
        throw new Error("Unauthorized")
    }

    return res
}

export async function getJson<T>(path: string): Promise<T> {
    const res = await backendFetch(path)
    if (!res.ok) throw new Error(await safeText(res))
    return res.json() as Promise<T>
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await backendFetch(path, {method: "POST", body: JSON.stringify(body)})
    console.log("-------postJon함수 실행 >> ",res)
    if (!res.ok) throw new Error(await safeText(res))
    return res.json() as Promise<T>
}

export async function deleteJson<T>(path: string): Promise<T> {
    const res = await backendFetch(path, {method: "DELETE"})
    if (!res.ok) throw new Error(await safeText(res))
    return res.json() as Promise<T>
}

// 채팅방의 레시피/카트 목록 조회
export async function getChatLists(chatId: string): Promise<{
    recipeList: Array<{
        messageId: string;
        content: string;
        timestamp: number;
        recipes: any[];
    }>;
    cartList: Array<{
        messageId: string;
        content: string;
        timestamp: number;
        items: any[];
    }>;
}> {
    return getJson(`/api/chat/${chatId}/lists`);
}

// 북마크 관련 API 함수들
// export interface BookmarkRequest {
//     recipeId: string;
//     recipeName: string;
//     recipeDescription?: string;
//     ingredients?: string[];
//     cookingMethods?: string[];
//     cookingTime?: string;
//     servings?: string;
//     difficulty?: string;
//     category?: string;
// }

// export interface BookmarkResponse {
//     success: boolean;
//     message: string;
//     data?: any[];
//     count?: number;
//     isBookmarked?: boolean;
// }

// 사용자의 모든 북마크 조회
// export async function getUserBookmarks(): Promise<BookmarkResponse> {
//     // --- 디버깅 코드 시작 ---
//     console.log("✅ [DEBUG] getUserBookmarks: /api/bookmarks API 호출 시작");
//     try {
//         const response = await getJson<BookmarkResponse>("/api/bookmarks");
//         console.log("  - API 응답 수신:", response);
//         if (response.success) {
//             console.log(`  - 성공: 북마크 ${response.count}개 수신`);
//         } else {
//             console.warn("  - API 응답 오류:", response.message);
//         }
//         return response;
//     } catch (error) {
//         console.error("❌ [DEBUG] getUserBookmarks: API 호출 중 심각한 오류 발생", error);
//         throw error; // 에러를 다시 던져서 호출한 쪽에서 처리하도록 함
//     }
//     // --- 디버깅 코드 종료 ---
// }

// 레시피 북마크 추가
// export async function addBookmark(recipe: BookmarkRequest): Promise<BookmarkResponse> {
//     return postJson("/api/bookmarks", recipe);
// }

// 레시피 북마크 제거
// export async function removeBookmark(recipeId: string): Promise<BookmarkResponse> {
//     return deleteJson(`/api/bookmarks/${recipeId}`);
// }

// 레시피 북마크 여부 확인
// export async function checkBookmark(recipeId: string): Promise<BookmarkResponse> {
//     return getJson(`/api/bookmarks/${recipeId}/check`);
// }

// 레시피 북마크 토글 (추가/제거)
// export async function toggleBookmark(recipeId: string, recipe: BookmarkRequest): Promise<BookmarkResponse> {
//     return postJson(`/api/bookmarks/${recipeId}/toggle`, recipe);
// }

async function safeText(res: Response): Promise<string> {
    try {
        return await res.text()
    } catch {
        return `${res.status} ${res.statusText}`
    }
}


// ✨ FormData 전송 함수 (새로 추가)
export async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem("jwtToken");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(path, {
    method: "POST",
    headers, // 인증 헤더 추가
    body: formData,
  });
  console.log("-------postMultipart함수 실행 >> ",res)

  if (!res.ok) {
      const errorText = await res.text();
      // 에러 응답이 JSON 형태일 수 있으므로 파싱 시도
      try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || errorJson.error || errorText);
      } catch (e) {
          throw new Error(errorText);
      }
  }
  return res.json() as Promise<T>;
}

// 재료 검색을 위한 새로운 API 함수
export async function searchIngredient(chatId: string, ingredientName: string): Promise<any> {
    return postJson(`/api/chat/${chatId}/ingredient/search`, {
        ingredient_name: ingredientName
    });
}

// 새로운 재료 검색 및 카트 추가 함수
export interface SearchIngredientRequest {
    query: string;
    userId: string;
    chatId: string;
}

export interface SearchIngredientResponse {
    success: boolean;
    data: any;
    searchResults: any[];
}

export async function searchIngredientAndAddToCart(request: SearchIngredientRequest): Promise<SearchIngredientResponse> {
    return postJson("/api/search-ingredient", request);
}

// 장바구니에 재료 추가 함수
export interface AddToCartRequest {
    chatId: string;
    foodName: string;
}

export interface AddToCartResponse {
    message: string;
    cartMessageId: string;
    products: Array<{
        productName: string;
        price: number;
        imageUrl: string;
        productAddress: string;
    }>;
}

export async function addToCart(request: AddToCartRequest): Promise<AddToCartResponse> {
    return postJson(`/api/chat/${request.chatId}/add-to-cart`, {
        chatId: request.chatId,
        foodName: request.foodName
    });
}



