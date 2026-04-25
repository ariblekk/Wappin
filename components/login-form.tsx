"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { GalleryVerticalEndIcon, Loader2 } from "lucide-react"
import { sendOtp, verifyOtp } from "@/app/actions/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [step, setStep] = React.useState<"email" | "otp">("email")
  const [userId, setUserId] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const result = await sendOtp(email)
    if (result.success && result.userId) {
      setUserId(result.userId)
      setStep("otp")
    } else {
      setError(result.error || "Failed to send OTP")
    }
    setIsLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await verifyOtp(userId, otp)
    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "Invalid OTP")
    }
    setIsLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={step === "email" ? handleSendOtp : handleVerifyOtp}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-6" />
            </div>
            <h1 className="text-xl font-bold">
              {step === "email" ? "Welcome back" : "Check your email"}
            </h1>
            <FieldDescription>
              {step === "email" 
                ? "Enter your email to receive a login code" 
                : `We've sent a code to ${email}`}
            </FieldDescription>
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive text-center">
              {error}
            </div>
          )}

          {step === "email" ? (
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="otp">Login Code</FieldLabel>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button 
                variant="link" 
                className="px-0 font-normal h-auto" 
                type="button"
                onClick={() => setStep("email")}
              >
                Change email
              </Button>
            </Field>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === "email" ? "Send Code" : "Login"}
          </Button>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#" className="underline">Terms of Service</a>{" "}
        and <a href="#" className="underline">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
