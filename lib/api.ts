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



