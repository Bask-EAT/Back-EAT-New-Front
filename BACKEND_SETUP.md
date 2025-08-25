# 백엔드 연결 설정

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```bash
# 백엔드 API 기본 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Firebase 설정 (기존 설정 유지)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCP1DcZNh_XeueQCqVqbVRWFhcp6KK6Qts
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bask-eat.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bask-eat
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bask-eat.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=579953258832
NEXT_PUBLIC_FIREBASE_APP_ID=1:579953258832:web:10860856b7e9b8ae527c55
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-8DH02RGPQD
```

## 백엔드 API 엔드포인트

다음 API 엔드포인트들이 백엔드에서 구현되어야 합니다:

### 채팅 관련
- `POST /api/chat/create` - 새 채팅 생성
- `GET /api/chat/{id}` - 특정 채팅 조회
- `GET /api/chat/list` - 모든 채팅 목록 조회
- `POST /api/chat/{id}/message` - 메시지 추가
- `POST /api/chat/{id}/recipes` - 레시피 추가
- `POST /api/chat/{id}/cart-items` - 장바구니 아이템 추가

### 북마크 관련
- `GET /api/bookmarks` - 모든 북마크 ID 조회
- `POST /api/bookmarks` - 북마크 추가
- `DELETE /api/bookmarks/{id}` - 북마크 제거
- `GET /api/bookmarks/{id}/check` - 북마크 여부 확인

## 변경 사항

1. **IndexedDB 제거**: 모든 로컬 데이터베이스 기능을 백엔드 API로 대체
2. **새로운 서비스**: `lib/chat-service.ts`에서 백엔드 API 호출 관리
3. **useChat 훅 수정**: IndexedDB 대신 백엔드 API 사용
4. **에러 처리**: 네트워크 오류 및 백엔드 연결 실패 시 적절한 에러 메시지 표시

## 백엔드 구현 요구사항

백엔드에서는 Firestore를 사용하여 다음 데이터를 저장해야 합니다:

- 채팅 세션 정보
- 사용자 메시지 및 AI 응답
- 레시피 정보
- 장바구니 아이템
- 북마크된 레시피

## 테스트

백엔드 서버가 실행 중인지 확인하고 다음 명령으로 프론트엔드를 실행하세요:

```bash
npm run dev
# 또는
pnpm dev
```
