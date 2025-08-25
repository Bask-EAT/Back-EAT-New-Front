"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { signInWithGoogleAndGetIdToken } from "@/lib/firebase"

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"

export function LoginGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem("jwtToken")
    setToken(t)
    setLoading(false)
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const idToken = await signInWithGoogleAndGetIdToken()
      const res = await fetch(`${BACKEND_BASE}/fh/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("서버 인증 실패")
      const data = await res.json()
      const accessToken = data?.accessToken || data?.token
      if (!accessToken) throw new Error("토큰 응답 누락")
      localStorage.setItem("jwtToken", accessToken)
      setToken(accessToken)
    } catch (e: any) {
      alert(e?.message || "로그인 실패")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>
  }

  if (!token) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Button size="lg" onClick={handleGoogleLogin}>Google 계정으로 로그인</Button>
      </div>
    )
  }

  return <>{children}</>
}


