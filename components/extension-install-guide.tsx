"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Chrome, CheckCircle, AlertCircle, ExternalLink, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExtensionInstallGuideProps {
  isOpen: boolean
  onClose: () => void
}

type StepIcon = typeof Download | typeof Chrome | typeof CheckCircle | typeof AlertCircle | typeof ExternalLink | typeof ArrowRight

export function ExtensionInstallGuide({ isOpen, onClose }: ExtensionInstallGuideProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Firebase Storage 다운로드 URL (올바른 버킷 이름 사용)
  const extensionUrl = "https://firebasestorage.googleapis.com/v0/b/bask-eat.firebasestorage.app/o/extension%2Fgen-cart.zip?alt=media"
  
  const steps = [
    {
      id: 1,
      title: "확장프로그램 다운로드",
      description: "Chrome 확장프로그램 파일을 다운로드합니다.",
      icon: Download,
      action: "다운로드 시작"
    },
    {
      id: 2,
      title: "Chrome 확장프로그램 관리 페이지 열기",
      description: "Chrome 브라우저에서 확장프로그램 관리 페이지를 엽니다. 왼쪽 위 ⋮ 버튼 → 확장프로그램 → 확장프로그램 관리 또는 주소창에 'chrome://extensions/'를 입력하세요.",
      icon: Chrome,
      action: "페이지 열기 + 안내"
    },
    {
      id: 3,
      title: "개발자 모드 활성화",
      description: "우측 상단의 '개발자 모드' 토글을 켭니다.",
      icon: CheckCircle,
      action: "확인"
    },
    {
      id: 4,
      title: "압축 해제된 확장프로그램 로드",
      description: "다운로드한 파일을 압축 해제하고 '압축해제된 확장프로그램을 로드합니다' 버튼을 클릭합니다.",
      icon: CheckCircle,
      action: "확인"
    },
    {
      id: 5,
      title: "설치 완료",
      description: "확장프로그램이 성공적으로 설치되었습니다!",
      icon: CheckCircle,
      action: "완료"
    }
  ]

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Firebase Storage에서 직접 다운로드
      const response = await fetch(extensionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip,application/octet-stream,*/*',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Content-Type 확인
      const contentType = response.headers.get('content-type')
      console.log('Response Content-Type:', contentType)
      
      // 파일 크기 확인
      const contentLength = response.headers.get('content-length')
      console.log('File size:', contentLength, 'bytes')
      
      const blob = await response.blob()
      
      // Blob 크기 확인
      console.log('Blob size:', blob.size, 'bytes')
      
      if (blob.size === 0) {
        throw new Error('다운로드된 파일이 비어있습니다.')
      }
      
      // ZIP 파일인지 확인 (MIME 타입 또는 파일 시그니처)
      if (blob.type && !blob.type.includes('zip') && !blob.type.includes('octet-stream')) {
        console.warn('Unexpected content type:', blob.type)
      }
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'gen-cart.zip'
      a.style.display = 'none'
      
      // 다운로드 트리거
      document.body.appendChild(a)
      a.click()
      
      // 정리
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
      
      // 다음 단계로 이동
      setCurrentStep(2)
    } catch (error) {
      console.error('Firebase Storage 다운로드 실패:', error)
      
      // 대체 다운로드 방법 시도
      try {
        console.log('대체 다운로드 방법 시도...')
        await handleAlternativeDownload()
        setCurrentStep(2)
        return
      } catch (altError) {
        console.error('대체 다운로드도 실패:', altError)
      }
      
      // 더 자세한 에러 메시지 표시
      let errorMessage = '다운로드에 실패했습니다.'
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          errorMessage = '서버에서 파일을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.'
        } else if (error.message.includes('비어있습니다')) {
          errorMessage = '다운로드된 파일이 손상되었습니다. 관리자에게 문의해주세요.'
        } else {
          errorMessage = `다운로드 오류: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  // 대체 다운로드 방법
  const handleAlternativeDownload = async () => {
    console.log('대체 다운로드 방법 시도 중...')
    
    // 방법 1: window.open을 사용한 직접 다운로드
    try {
      console.log('방법 1: window.open 시도...')
      window.open(extensionUrl, '_blank')
      return
    } catch (error) {
      console.error('window.open 다운로드 실패:', error)
    }
    
    // 방법 2: iframe을 사용한 다운로드
    try {
      console.log('방법 2: iframe 시도...')
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = extensionUrl
      document.body.appendChild(iframe)
      
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 5000)
      
      return
    } catch (error) {
      console.error('iframe 다운로드 실패:', error)
    }
    
    // 방법 3: 공개 URL로 직접 다운로드
    try {
      console.log('방법 3: 공개 URL 시도...')
      const publicUrl = `https://storage.googleapis.com/bask-eat.firebasestorage.app/extension/gen-cart.zip`
      window.open(publicUrl, '_blank')
      return
    } catch (error) {
      console.error('공개 URL 다운로드 실패:', error)
    }
    
    // 방법 4: 수동 다운로드 안내
    console.log('방법 4: 수동 다운로드 안내...')
    const manualDownloadUrl = `https://storage.googleapis.com/bask-eat.firebasestorage.app/extension/gen-cart.zip`
    
    if (confirm(`자동 다운로드가 실패했습니다.\n\n수동으로 다운로드하시겠습니까?\n\n링크: ${manualDownloadUrl}`)) {
      window.open(manualDownloadUrl, '_blank')
      return
    }
    
    throw new Error('모든 다운로드 방법이 실패했습니다.')
  }

  const handleOpenChromeExtensions = () => {
    // Chrome 확장프로그램 관리 페이지를 여는 방법 안내
    try {
      // 방법 1: chrome://extensions/ 직접 열기 (Chrome에서만 작동)
      if (navigator.userAgent.includes('Chrome')) {
        try {
          window.open('chrome://extensions/', '_blank')
          // 잠시 후 다음 단계로 진행
          setTimeout(() => {
            setCurrentStep(3)
          }, 2000)
          return
        } catch (error) {
          console.log('chrome://extensions/ 직접 열기 실패, 메뉴 방법 안내')
        }
      }
      
      // 방법 2: Chrome 메뉴를 통한 방법 안내 (더 정확한 경로)
      const menuGuide = `Chrome 확장프로그램 관리 페이지를 여는 방법:

1. Chrome 브라우저 왼쪽 위의 ⋮ (점 3개) 버튼 클릭
2. '확장프로그램' 메뉴 클릭
3. '확장프로그램 관리' 클릭

또는 주소창에 'chrome://extensions/' 입력

확인을 누르면 다음 단계로 진행됩니다.`

      if (confirm(menuGuide)) {
        setCurrentStep(3)
      }
    } catch (error) {
      console.error('Chrome 확장프로그램 페이지 열기 실패:', error)
      // 에러가 발생해도 다음 단계로 진행
      setCurrentStep(3)
    }
  }

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleComplete = () => {
    onClose()
    // 페이지 새로고침하여 확장프로그램 감지
    window.location.reload()
  }

  if (!isOpen) return null

  const CurrentIcon = steps[currentStep - 1].icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Chrome className="w-6 h-6 text-blue-600" />
            Chrome 확장프로그램 설치 가이드
          </CardTitle>
          <p className="text-sm text-gray-600">
            자동 장바구니 기능을 사용하려면 확장프로그램을 설치해야 합니다
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 진행 단계 표시 */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep >= step.id 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                )}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1 text-center">
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                )}
              </div>
            ))}
          </div>

          {/* 현재 단계 내용 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <CurrentIcon className="w-8 h-8 text-blue-600" />
            </div>
            
            <h3 className="text-xl font-semibold">
              {steps[currentStep - 1].title}
            </h3>
            
            <p className="text-gray-600">
              {steps[currentStep - 1].description}
            </p>

            {/* 단계별 액션 버튼 */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloading}
                  className="w-full max-w-xs"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {steps[currentStep - 1].action}
                    </>
                  )}
                </Button>
                
                {/* 디버깅 정보 */}
                <div className="text-xs text-gray-500 text-center">
                  <p>다운로드 URL: {extensionUrl}</p>
                  <p>파일 크기: 확인 중...</p>
                  <p>상태: 대기 중</p>
                </div>
                
                {/* 문제 해결 팁 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-800 text-sm">다운로드 문제 해결 팁</p>
                      <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                        <li>브라우저 개발자 도구(F12)를 열고 Console 탭을 확인하세요</li>
                        <li>다운로드가 실패하면 자동으로 대체 방법을 시도합니다</li>
                        <li>여전히 문제가 있다면 관리자에게 문의해주세요</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-3">
                <Button 
                  onClick={handleOpenChromeExtensions}
                  className="w-full max-w-xs"
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  페이지 열기 + 안내
                </Button>
                
                {/* 단계별 시각적 안내 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-2">
                    <Chrome className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">Chrome 확장프로그램 관리 페이지 열기</p>
                      <div className="text-sm text-yellow-700 mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>Chrome 브라우저 왼쪽 위의 ⋮ (점 3개) 버튼 클릭</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>'확장프로그램' 메뉴 클릭</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>'확장프로그램 관리' 클릭</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-yellow-600">또는</span>
                          <span className="text-xs text-yellow-600">주소창에 'chrome://extensions/' 입력</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">개발자 모드 활성화 방법</p>
                      <div className="text-sm text-yellow-700 mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>확장프로그램 관리 페이지에서 우측 상단의 '개발자 모드' 토글을 찾습니다</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>토글을 클릭하여 활성화합니다 (파란색으로 변경됨)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>활성화되면 '압축해제된 확장프로그램을 로드합니다' 버튼이 나타납니다</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleNextStep}
                  className="w-full max-w-xs"
                >
                  개발자 모드 활성화 완료
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-800">압축 해제 및 로드 방법</p>
                      <div className="text-sm text-blue-700 mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>다운로드한 'gen-cart.zip' 파일을 압축 해제합니다</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>압축 해제된 폴더를 선택합니다</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>'압축해제된 확장프로그램을 로드합니다' 버튼을 클릭합니다</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                          <span>확장프로그램이 목록에 추가되면 설치가 완료됩니다</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleNextStep}
                  className="w-full max-w-xs"
                >
                  확장프로그램 로드 완료
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      축하합니다! 확장프로그램 설치가 완료되었습니다.
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={handleComplete}
                  className="w-full max-w-xs bg-green-600 hover:bg-green-700"
                >
                  완료 및 새로고침
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>

          {/* 하단 버튼들 */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 max-w-xs"
            >
              나중에 하기
            </Button>
            
            {currentStep > 1 && currentStep < 5 && (
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 max-w-xs"
              >
                이전 단계
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
