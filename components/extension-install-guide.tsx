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
  
  const extensionUrl = "https://firebasestorage.googleapis.com/v0/b/bask-eat.appspot.com/o/extension%2Fgen-cart.zip?alt=media"
  
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
      title: "Chrome 확장프로그램 페이지 열기",
      description: "Chrome 브라우저에서 확장프로그램 관리 페이지를 엽니다. 왼쪽 위 ⋮ 버튼 → 도구 더보기 → 확장프로그램 또는 주소창에 'chrome://extensions/'를 입력하세요.",
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
      const response = await fetch(extensionUrl)
      const blob = await response.blob()
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'gen-cart.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // 다음 단계로 이동
      setCurrentStep(2)
    } catch (error) {
      console.error('다운로드 실패:', error)
      alert('다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleOpenChromeExtensions = () => {
    // Chrome 확장프로그램 관리 페이지를 여는 방법 안내
    try {
      // 방법 1: chrome://extensions/ 직접 열기 (Chrome에서만 작동)
      if (navigator.userAgent.includes('Chrome')) {
        window.open('chrome://extensions/', '_blank')
      }
      
      // 방법 2: Chrome 메뉴를 통한 방법 안내
      if (confirm(`Chrome 확장프로그램 관리 페이지를 여는 방법:\n\n1. Chrome 브라우저 왼쪽 위의 ⋮ (점 3개) 버튼 클릭\n2. '도구 더보기' 메뉴 클릭\n3. '확장프로그램' 클릭\n\n또는 주소창에 'chrome://extensions/' 입력\n\n확인을 누르면 다음 단계로 진행됩니다.`)) {
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
            )}

            {currentStep === 2 && (
              <Button 
                onClick={handleOpenChromeExtensions}
                className="w-full max-w-xs"
              >
                <Chrome className="w-4 h-4 mr-2" />
                페이지 열기 + 안내
              </Button>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">개발자 모드 활성화 방법</p>
                      <ol className="text-sm text-yellow-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>Chrome 확장프로그램 페이지에서 우측 상단의 '개발자 모드' 토글을 찾습니다</li>
                        <li>토글을 클릭하여 활성화합니다 (파란색으로 변경됨)</li>
                        <li>활성화되면 '압축해제된 확장프로그램을 로드합니다' 버튼이 나타납니다</li>
                      </ol>
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
                      <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                        <li>다운로드한 'gen-cart.zip' 파일을 압축 해제합니다</li>
                        <li>압축 해제된 폴더를 선택합니다</li>
                        <li>'압축해제된 확장프로그램을 로드합니다' 버튼을 클릭합니다</li>
                        <li>확장프로그램이 목록에 추가되면 설치가 완료됩니다</li>
                      </ol>
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
            >
              나중에 하기
            </Button>
            
            {currentStep > 1 && currentStep < 5 && (
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
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
