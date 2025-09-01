# 🚀 Recipe AI 앱 GCP 배포 가이드

## 📋 개요
이 문서는 Recipe AI Next.js 애플리케이션을 Google Cloud Platform(GCP)에 배포하는 방법을 설명합니다.

## 🎯 배포된 서비스 정보
- **서비스 URL**: https://recipe-ai-app-n5qjhbnn4a-uc.a.run.app
- **프로젝트 ID**: bask-eat
- **리전**: us-central1
- **서비스명**: recipe-ai-app

## 🛠️ 사전 요구사항

### 1. GCP 계정 및 프로젝트
- GCP 계정 생성
- 프로젝트 생성 및 설정
- 필요한 API 활성화:
  - Container Registry API
  - Cloud Run API

### 2. 로컬 개발 환경
- Google Cloud CLI 설치
- Docker Desktop 설치
- Node.js 20+ 설치

### 3. 인증 설정
```bash
# GCP 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project bask-eat

# Docker 인증 설정
gcloud auth configure-docker
```

## 🚀 배포 방법

### 방법 1: 자동화 스크립트 사용 (권장)
```bash
# 배포 스크립트 실행
./deploy.sh
```

### 방법 2: 수동 배포
```bash
# 1. Docker 이미지 빌드 (AMD64 아키텍처)
docker buildx build --platform linux/amd64 -t gcr.io/bask-eat/recipe-ai-app --push .

# 2. Cloud Run 배포
gcloud run deploy recipe-ai-app \
  --image gcr.io/bask-eat/recipe-ai-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

## 📁 프로젝트 구조

### 주요 파일
- `Dockerfile`: 멀티스테이지 Docker 빌드 설정
- `.dockerignore`: Docker 빌드 시 제외할 파일들
- `next.config.mjs`: Next.js 설정 (standalone 출력 활성화)
- `deploy.sh`: 자동화 배포 스크립트

### 기술 스택
- **프레임워크**: Next.js 15
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 라이브러리**: Radix UI
- **인증**: Firebase
- **배포**: Google Cloud Run

## 🔧 환경 변수 설정

### Cloud Run에서 설정 가능한 환경 변수
- `NODE_ENV`: production
- `NEXT_PUBLIC_BACKEND_BASE`: 백엔드 API URL
- Firebase 관련 환경 변수들

### 환경 변수 설정 방법
```bash
gcloud run services update recipe-ai-app \
  --region us-central1 \
  --set-env-vars NODE_ENV=production
```

## 📊 모니터링 및 로깅

### Cloud Run 로그 확인
```bash
gcloud logs read --service=recipe-ai-app --limit=50
```

### 서비스 상태 확인
```bash
gcloud run services describe recipe-ai-app --region us-central1
```

## 🔄 업데이트 배포

### 코드 변경 후 재배포
1. 코드 수정
2. `./deploy.sh` 실행
3. 자동으로 새 버전이 배포됨

### 특정 버전으로 롤백
```bash
gcloud run services update-traffic recipe-ai-app \
  --region us-central1 \
  --to-revisions=recipe-ai-app-00001-xxx=100
```

## 🛡️ 보안 고려사항

### 현재 설정
- ✅ 인증되지 않은 사용자 접근 허용 (--allow-unauthenticated)
- ✅ HTTPS 자동 설정
- ✅ 자동 스케일링

### 추가 보안 설정 (선택사항)
- Cloud Armor 설정
- IAM 정책 구성
- VPC 커넥터 설정

## 💰 비용 최적화

### 현재 설정
- **CPU**: 1 vCPU (기본값)
- **메모리**: 512MB (기본값)
- **최소 인스턴스**: 0 (콜드 스타트 허용)
- **최대 인스턴스**: 100 (기본값)

### 비용 최적화 옵션
```bash
# 리소스 제한 설정
gcloud run services update recipe-ai-app \
  --region us-central1 \
  --cpu=1 \
  --memory=512Mi \
  --max-instances=10
```

## 🆘 문제 해결

### 일반적인 문제들

1. **빌드 실패**
   - Docker 데몬 실행 확인
   - Node.js 버전 호환성 확인
   - 의존성 설치 문제 확인

2. **배포 실패**
   - GCP 인증 상태 확인
   - 프로젝트 권한 확인
   - 이미지 아키텍처 확인 (AMD64 필요)

3. **애플리케이션 오류**
   - Cloud Run 로그 확인
   - 환경 변수 설정 확인
   - Firebase 설정 확인

### 유용한 명령어
```bash
# 서비스 로그 확인
gcloud logs read --service=recipe-ai-app

# 서비스 상태 확인
gcloud run services describe recipe-ai-app --region us-central1

# 이미지 목록 확인
gcloud container images list --repository=gcr.io/bask-eat

# 프로젝트 설정 확인
gcloud config list
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. GCP 콘솔의 Cloud Run 서비스 페이지
2. Cloud Run 로그
3. 이 문서의 문제 해결 섹션

---

**마지막 업데이트**: 2025년 9월 1일
**배포 버전**: v1.0.0


