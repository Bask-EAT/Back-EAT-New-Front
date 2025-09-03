export function getJwt(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("jwtToken")
}

export function getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const jwt = localStorage.getItem("jwtToken");
    if (jwt && jwt.trim()) {
        return { "Authorization": `Bearer ${jwt}` };
    }
    const firebaseIdToken = localStorage.getItem("firebaseIdToken");
    if (firebaseIdToken && firebaseIdToken.trim()) {
        return { "Authorization": `Bearer firebase-${firebaseIdToken}` };
    }
    return {};
}

// 중복 제거: 여기저기서 localStorage를 직접 읽고 헤더 붙이는 코드를 반복하지 않기 위해.
// 일관성/오타 방지: Authorization: Bearer <JWT> 형식을 한 곳에서 표준화.
// SSR 안전성: typeof window 체크로 서버 렌더링 시 오류 방지.
// 변경 용이성: 나중에 토큰 저장소를 쿠키/세션으로 바꿔도 한 파일만 수정하면 전체 반영.
// 테스트/유지보수: 토큰 주입 로직을 한 지점에서 목/검증하기 쉬움.