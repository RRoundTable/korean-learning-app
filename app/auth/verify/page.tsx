"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function VerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error")
        return
      }

      // TODO: Implement email verification
      // Simulate API call
      setTimeout(() => {
        setStatus("success")
      }, 2000)
    }

    verifyEmail()
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-xl bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              {status === "loading" && <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />}
              {status === "success" && <CheckCircle className="w-8 h-8 text-primary-foreground" />}
              {status === "error" && <XCircle className="w-8 h-8 text-primary-foreground" />}
            </div>

            <CardTitle className="text-2xl font-bold text-card-foreground">
              {status === "loading" && "이메일 인증 중..."}
              {status === "success" && "인증 완료!"}
              {status === "error" && "인증 실패"}
            </CardTitle>

            <CardDescription className="text-muted-foreground">
              {status === "loading" && "잠시만 기다려주세요."}
              {status === "success" && "회원가입이 완료되었습니다. 이제 한국어 학습을 시작할 수 있습니다!"}
              {status === "error" && "인증 링크가 유효하지 않거나 만료되었습니다."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === "success" && (
              <Link href="/">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">학습 시작하기</Button>
              </Link>
            )}

            {status === "error" && (
              <Link href="/auth/signin">
                <Button variant="outline" className="w-full bg-transparent border-border">
                  다시 시도하기
                </Button>
              </Link>
            )}

            <Link href="/">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-card-foreground">
                홈으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
