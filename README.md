# Bask-EAT Frontend

Next.js 15와 React 19를 기반으로 한 AI 레시피 어시스턴트 프론트엔드 애플리케이션입니다. 사용자 친화적인 인터페이스를 통해 AI와의 자연스러운 대화, 레시피 탐색, 장바구니 생성, 북마크 관리 등의 기능을 제공합니다.

## 🚀 주요 기능

### 💬 **AI 채팅 시스템**
- **실시간 대화**: AI와 자연스러운 한국어 대화
- **컨텍스트 유지**: 대화 히스토리 기반 연속성 있는 응답
- **멀티미디어 지원**: 텍스트 및 이미지 입력 처리
- **실시간 응답**: AI의 즉시 피드백 및 제안

### 🍳 **레시피 탐색 및 관리**
- **AI 레시피 추천**: 대화 기반 맞춤형 레시피 제공
- **상세 레시피 정보**: 재료, 조리법, 조리 시간, 난이도
- **레시피 북마크**: 선호하는 레시피 저장 및 관리
- **카테고리별 분류**: 음식 유형별 체계적 정리

### 🛒 **스마트 장바구니**
- **자동 장바구니 생성**: AI가 추천한 레시피 기반 재료 목록
- **상품 연동**: 재료명으로 관련 상품 자동 검색
- **수량 관리**: 재료별 필요량 및 단위 표시
- **쇼핑 리스트**: 체계적인 구매 계획 수립

### 🎥 **유튜브 레시피 분석**
- **영상 링크 분석**: 유튜브 URL에서 레시피 자동 추출
- **비동기 처리**: 대용량 영상 분석을 위한 백그라운드 처리
- **진행 상황 표시**: 분석 상태 실시간 모니터링

### 🔐 **사용자 인증 및 관리**
- **Google OAuth**: 소셜 로그인 지원
- **Firebase Authentication**: 안전한 사용자 인증
- **개인화 서비스**: 사용자별 맞춤형 경험
- **데이터 동기화**: 클라우드 기반 데이터 저장

## 🛠️ 기술 스택

### **Frontend Framework**
- **Next.js**: 15.2.4 (App Router)
- **React**: 19 (최신 버전)
- **TypeScript**: 5.x (타입 안전성)
- **Tailwind CSS**: 4.1.9 (유틸리티 기반 스타일링)

### **UI 컴포넌트**
- **Radix UI**: 접근성 중심의 헤드리스 컴포넌트
- **Lucide React**: 아이콘 라이브러리
- **Shadcn/ui**: 재사용 가능한 UI 컴포넌트
- **Tailwind CSS Animate**: 부드러운 애니메이션

### **상태 관리 및 데이터**
- **React Hooks**: 커스텀 훅 기반 상태 관리
- **React Hook Form**: 폼 상태 및 검증
- **Zod**: 런타임 타입 검증
- **Firebase**: 인증 및 데이터베이스

### **개발 도구**
- **ESLint**: 코드 품질 관리
- **PostCSS**: CSS 전처리
- **Autoprefixer**: 브라우저 호환성
- **TypeScript**: 정적 타입 검사

## 📋 요구사항

### **시스템 요구사항**
- **Node.js**: 18.17.0 이상
- **npm**: 9.0.0 이상 또는 pnpm 8.0.0 이상
- **메모리**: 최소 4GB RAM (권장 8GB+)
- **저장공간**: 최소 2GB 여유 공간

### **외부 서비스**
- **Firebase 프로젝트**: Authentication 및 Firestore 설정
- **백엔드 API 서버**: Spring Boot 백엔드 (포트 8080)
- **LLM 모듈**: AI 레시피 분석 서비스 (포트 8001)

## 🚀 설치 및 실행

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd Back-EAT-Front-V2

# npm 사용
npm install

# 또는 pnpm 사용 (권장)
pnpm install

# 또는 yarn 사용
yarn install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```bash
# 백엔드 API 기본 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication에서 Google 로그인 활성화
3. Firestore Database 생성 및 보안 규칙 설정
4. 프로젝트 설정에서 웹 앱 등록 및 설정 정보 복사

### 4. 개발 서버 실행

```bash
# 개발 모드로 실행
npm run dev

# 또는 pnpm 사용
pnpm dev

# 또는 yarn 사용
yarn dev
```

### 5. 브라우저에서 접속

```
프론트엔드: http://localhost:3000
백엔드 API: http://localhost:8080
LLM 모듈: http://localhost:8001
```

## 🏗️ 프로젝트 구조

```
Back-EAT-New-Front-feature-chat-improvements/
├── app/                              # 🚀 Next.js App Router
│   ├── page.tsx                     # 메인 페이지
│   ├── layout.tsx                   # 루트 레이아웃
│   ├── globals.css                  # 전역 스타일
│   └── api/                         # API 라우트
├── components/                       # 🧩 React 컴포넌트
│   ├── main-layout.tsx              # 메인 레이아웃 컴포넌트
│   ├── left-sidebar.tsx             # 왼쪽 사이드바 (채팅 히스토리)
│   ├── right-chat-sidebar.tsx       # 오른쪽 채팅 사이드바
│   ├── recipe-exploration-screen.tsx # 레시피 탐색 화면
│   ├── shopping-list-screen.tsx     # 쇼핑 리스트 화면
│   ├── BookmarkList.tsx             # 북마크 목록
│   ├── LoginGate.tsx                # 로그인 게이트
│   ├── welcome-screen.tsx           # 환영 화면
│   ├── extension-install-guide.tsx  # 확장 프로그램 설치 가이드
│   ├── theme-provider.tsx           # 테마 제공자
│   └── ui/                          # 재사용 가능한 UI 컴포넌트
│       ├── button.tsx               # 버튼 컴포넌트
│       ├── input.tsx                # 입력 필드
│       ├── card.tsx                 # 카드 컴포넌트
│       ├── dialog.tsx               # 다이얼로그
│       └── ...                      # 기타 UI 컴포넌트들
├── lib/                             # 🔧 유틸리티 및 서비스
│   ├── api.ts                       # API 통신 유틸리티
│   ├── chat-service.ts              # 채팅 서비스
│   ├── bookmark-service.ts          # 북마크 서비스
│   ├── firebase.ts                  # Firebase 설정
│   ├── auth.ts                      # 인증 유틸리티
│   └── utils.ts                     # 공통 유틸리티
├── hooks/                           # 🪝 커스텀 React 훅
│   ├── useChat.ts                   # 채팅 관련 상태 관리
│   ├── useAuth.ts                   # 인증 상태 관리
│   ├── use-toast.ts                 # 토스트 알림 관리
│   └── use-mobile.ts                # 모바일 디바이스 감지
├── src/                             # 📁 소스 코드
│   ├── types.ts                     # TypeScript 타입 정의
│   └── chat.ts                      # 채팅 관련 타입
├── public/                          # 🌐 정적 파일
│   ├── logo.png                     # 로고 이미지
│   ├── placeholder-logo.svg         # 플레이스홀더 로고
│   └── placeholder-user.jpg         # 기본 사용자 이미지
├── styles/                          # 🎨 스타일 파일
│   └── globals.css                  # 전역 CSS 스타일
├── package.json                     # 프로젝트 의존성 및 스크립트
├── next.config.mjs                  # Next.js 설정
├── tailwind.config.js               # Tailwind CSS 설정
├── tsconfig.json                    # TypeScript 설정
└── README.md                        # 프로젝트 문서
```

## 🎯 주요 컴포넌트 설명

### **MainLayout**
- 전체 애플리케이션의 레이아웃 구조
- 좌우 사이드바 및 메인 콘텐츠 영역 관리
- 반응형 디자인 및 모바일 대응

### **LeftSidebar**
- 채팅 히스토리 및 세션 관리
- 새 채팅 생성 및 기존 채팅 선택
- 사용자 프로필 및 설정

### **RightChatSidebar**
- 실시간 채팅 인터페이스
- 메시지 입력 및 이미지 업로드
- AI 응답 표시 및 상호작용

### **RecipeExplorationScreen**
- AI가 추천한 레시피 목록 표시
- 레시피 상세 정보 및 재료 목록
- 북마크 및 장바구니 추가 기능

### **ShoppingListScreen**
- 선택된 재료들의 쇼핑 리스트
- 상품 검색 및 가격 비교
- 구매 계획 수립 및 관리

## 🔧 개발 가이드

### **새로운 컴포넌트 추가**

1. **컴포넌트 파일 생성**
```tsx
// components/NewComponent.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface NewComponentProps {
  title: string
  onAction?: () => void
}

export function NewComponent({ title, onAction }: NewComponentProps) {
  const [count, setCount] = useState(0)

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="mb-4">Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  )
}
```

2. **타입 정의 추가**
```typescript
// src/types.ts
export interface NewComponentData {
  id: string
  title: string
  description?: string
  createdAt: Date
}
```

3. **커스텀 훅 생성**
```typescript
// hooks/useNewComponent.ts
import { useState, useEffect } from "react"
import type { NewComponentData } from "@/src/types"

export function useNewComponent() {
  const [data, setData] = useState<NewComponentData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // API 호출 로직
      setLoading(false)
    } catch (error) {
      console.error("데이터 로드 실패:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { data, loading, refetch: fetchData }
}
```

### **API 통신 구현**

```typescript
// lib/new-service.ts
import { getJson, postJson, deleteJson } from "./api"

export class NewService {
  static async getItems(): Promise<any[]> {
    return await getJson("/api/items")
  }

  static async createItem(data: any): Promise<any> {
    return await postJson("/api/items", data)
  }

  static async deleteItem(id: string): Promise<void> {
    await deleteJson(`/api/items/${id}`)
  }
}
```

## 🎨 UI/UX 특징

### **반응형 디자인**
- **데스크톱**: 3단 레이아웃 (좌측바 + 메인 + 우측바)
- **태블릿**: 2단 레이아웃 (좌측바 + 메인/우측바)
- **모바일**: 단일 레이아웃 (탭 기반 네비게이션)

### **다크 모드 지원**
- **next-themes**: 시스템 테마 자동 감지
- **Tailwind CSS**: 다크 모드 클래스 자동 적용
- **일관된 색상 체계**: 라이트/다크 테마별 최적화

### **애니메이션 및 전환**
- **Tailwind CSS Animate**: 부드러운 페이지 전환
- **CSS Transitions**: 컴포넌트 상태 변화 애니메이션
- **Loading States**: 사용자 피드백을 위한 로딩 표시

### **접근성 (Accessibility)**
- **Radix UI**: ARIA 속성 자동 적용
- **키보드 네비게이션**: Tab 키를 통한 포커스 관리
- **스크린 리더 지원**: 시맨틱 HTML 및 ARIA 라벨

## 🔒 보안 고려사항

### **인증 및 권한**
- **Firebase Authentication**: 안전한 사용자 인증
- **JWT 토큰**: API 요청 시 인증 정보 전달
- **권한 기반 접근**: 사용자별 데이터 접근 제어

### **데이터 보안**
- **HTTPS**: 모든 통신 암호화
- **입력 검증**: 사용자 입력에 대한 클라이언트/서버 검증
- **XSS 방지**: React의 자동 이스케이프 처리

### **환경 변수 관리**
```bash
# 민감한 정보는 .env.local에 저장
# .gitignore에 .env.local 추가
echo ".env.local" >> .gitignore
```

## 🐳 배포 및 운영

### **빌드 및 배포**

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 또는 pnpm 사용
pnpm build
pnpm start
```

### **Docker 배포**

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### **환경별 설정**

```bash
# 개발 환경
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# 스테이징 환경
NODE_ENV=staging
NEXT_PUBLIC_API_BASE_URL=https://staging-api.example.com

# 프로덕션 환경
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

## 🐛 문제 해결

### **일반적인 문제**

1. **의존성 설치 오류**
   ```bash
   # node_modules 삭제 후 재설치
   rm -rf node_modules package-lock.json
   npm install
   
   # 또는 pnpm 사용
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. **빌드 오류**
   ```bash
   # TypeScript 오류 무시 (개발 중)
   # next.config.mjs에서 설정
   typescript: {
     ignoreBuildErrors: true
   }
   ```

3. **환경 변수 문제**
   ```bash
   # .env.local 파일 확인
   cat .env.local
   
   # 환경 변수 확인
   echo $NEXT_PUBLIC_API_BASE_URL
   ```

### **성능 최적화**

```typescript
// 이미지 최적화
import Image from "next/image"

// 동적 임포트
const DynamicComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <div>Loading...</div>
})

// 메모이제이션
const MemoizedComponent = React.memo(ExpensiveComponent)
```

## 🚀 향후 개선 계획

- [ ] **PWA 지원**: 오프라인 기능 및 앱 설치
- [ ] **실시간 알림**: WebSocket을 통한 실시간 업데이트
- [ ] **오프라인 모드**: Service Worker를 통한 캐싱
- [ ] **다국어 지원**: i18n을 통한 다국어 인터페이스
- [ ] **성능 모니터링**: Core Web Vitals 추적
- [ ] **A/B 테스트**: 기능별 사용자 경험 테스트
- [ ] **접근성 개선**: WCAG 2.1 AA 준수
- [ ] **모바일 앱**: React Native 또는 Capacitor 기반

## 📞 지원 및 기여

### **이슈 등록**
프로젝트에 문제가 발생하거나 개선 제안이 있으시면 GitHub Issues에 등록해주세요.

### **기여하기**
1. 프로젝트를 Fork하세요
2. 새로운 기능 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

### **개발 환경 설정**
```bash
# 코드 품질 검사
npm run lint

# 타입 체크
npx tsc --noEmit

# 테스트 실행 (구현 예정)
npm run test
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - React 기반 풀스택 프레임워크
- [React](https://react.dev/) - 사용자 인터페이스 구축 라이브러리
- [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 기반 CSS 프레임워크
- [Radix UI](https://www.radix-ui.com/) - 접근성 중심 UI 컴포넌트
- [Firebase](https://firebase.google.com/) - 클라우드 백엔드 서비스

---

**Bask-EAT Frontend**로 더 스마트한 요리 경험을 시작하세요! 🍳✨
