'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authAPI } from '@/lib/api'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ResendFormData = z.infer<typeof resendSchema>

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendFormData>({
    resolver: zodResolver(resendSchema),
  })

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid or missing verification token')
        setLoading(false)
        return
      }

      try {
        await authAPI.verifyEmail(token)
        setSuccess(true)
        setTimeout(() => router.push(ROUTES.LOGIN), 3000)
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } } }
        setError(
          error.response?.data?.message ||
            'Failed to verify email. The token may be invalid or expired.',
        )
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token, router])

  const onResendSubmit = async (data: ResendFormData) => {
    try {
      await authAPI.resendVerification(data.email)
      setResendSuccess(true)
      setShowResendForm(false)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to resend verification email')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Email</CardTitle>
          <CardDescription>Please wait while we verify your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified</CardTitle>
          <CardDescription>Your email has been successfully verified</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Your email has been verified successfully. You can now sign in to your account.
              Redirecting to login...
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href={ROUTES.LOGIN} className="text-blue-600 hover:underline">
            Go to login now
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (resendSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Email Sent</CardTitle>
          <CardDescription>Check your inbox</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              We&apos;ve sent a new verification link to your email. Please check your inbox and
              click the link to verify your account.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href={ROUTES.LOGIN} className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (showResendForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resend Verification</CardTitle>
          <CardDescription>Enter your email to receive a new verification link</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onResendSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowResendForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Verification Link'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Failed</CardTitle>
        <CardDescription>Unable to verify your email</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={() => setShowResendForm(true)} className="w-full">
          Resend Verification Email
        </Button>
        <Link href={ROUTES.LOGIN} className="text-sm text-slate-600 hover:underline">
          Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}
