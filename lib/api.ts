"use client"

import {getAuthHeaders} from "@/lib/auth"

export const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"

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


async function safeText(res: Response): Promise<string> {
    try {
        return await res.text()
    } catch {
        return `${res.status} ${res.statusText}`
    }
}


// ✨ FormData 전송 함수 (새로 추가)
export async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  const headers: HeadersInit = getAuthHeaders();
  const url = path.startsWith("http") ? path : `${BASE}${path}`;

  const res = await fetch(url, {
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



