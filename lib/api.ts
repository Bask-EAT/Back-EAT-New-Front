"use client"

import { getAuthHeaders } from "@/lib/auth"

const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...getAuthHeaders(),
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "include" })

  console.log("res 요청 확인------", res)

  if (res.status === 401) {
    try { localStorage.removeItem("jwtToken") } catch {}
    if (typeof window !== "undefined") {
      try { window.location.href = "/" } catch {}
    }
    throw new Error("Unauthorized")
  }

  return res
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await backendFetch(path)
  console.log("getJson 확인 --- : ", res);
  if (!res.ok) throw new Error(await safeText(res))
  return res.json() as Promise<T>
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await backendFetch(path, { method: "POST", body: JSON.stringify(body) })
  console.log("postJson 확인 -----", res);
  if (!res.ok) throw new Error(await safeText(res))
  return res.json() as Promise<T>
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text() } catch { return `${res.status} ${res.statusText}` }
}


