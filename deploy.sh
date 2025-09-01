#!/bin/bash

# GCP 배포 스크립트
# 사용법: ./deploy.sh

set -e

echo "🚀 Recipe AI 앱 GCP 배포 시작..."

# 프로젝트 설정
PROJECT_ID="bask-eat"
REGION="asia-northeast3"
SERVICE_NAME="recipe-ai-app"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "📋 프로젝트 정보:"
echo "  - 프로젝트 ID: $PROJECT_ID"
echo "  - 리전: $REGION"
echo "  - 서비스명: $SERVICE_NAME"
echo "  - 이미지: $IMAGE_NAME"

# 1. Docker 이미지 빌드 (AMD64 아키텍처)
echo "🔨 Docker 이미지 빌드 중..."
docker buildx build --platform linux/amd64 -t $IMAGE_NAME --push .

# 2. Cloud Run 배포
echo "☁️ Cloud Run에 배포 중..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000

# 3. 서비스 URL 출력
echo "✅ 배포 완료!"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
echo "🌐 서비스 URL: $SERVICE_URL"

echo "🎉 배포가 성공적으로 완료되었습니다!"

