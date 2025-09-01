"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { signInWithGoogleAndGetIdToken } from "@/lib/firebase"

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"

// 서버 응답 타입 정의
interface AuthResponse {
  accessToken?: string;
  token?: string;
  [key: string]: unknown;
}

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
      const data: AuthResponse = await res.json()
      const accessToken = data?.accessToken || data?.token
      if (!accessToken) throw new Error("토큰 응답 누락")
      localStorage.setItem("jwtToken", accessToken)
      setToken(accessToken)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "로그인 실패"
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* 로고 영역 */}
          <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-3xl border border-gray-200">
            🍔
          </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bask:EAT</h1>
            <p className="text-gray-600">고민 없이 한 번에 담으세요!</p>
          </div>

          {/* 로그인 카드 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">환영합니다!</h2>
              <p className="text-gray-600">Google 계정으로 로그인하고 모든 기능을 이용해보세요</p>
            </div>

            <Button 
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-300 shadow-sm transition-all duration-200 flex items-center justify-center gap-3 group"
              size="lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google 계정으로 로그인</span>
            </Button>

            {/* 추가 정보 */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                로그인하면 <span className="text-blue-600 font-medium">이용약관</span>과{' '}
                <span className="text-blue-600 font-medium">개인정보처리방침</span>에 동의하는 것으로 간주됩니다
              </p>
            </div>
          </div>

          {/* 하단 링크 */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              문제가 있으신가요?{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">고객지원</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


