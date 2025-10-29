'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { profilesAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RoleName } from '@/types'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      phone: user?.profile?.phone || '',
      address: user?.profile?.address || '',
      dateOfBirth: user?.profile?.dateOfBirth || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      setSuccess(null)

      // Show preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const result = await profilesAPI.uploadAvatar(file)
      setSuccess('Avatar uploaded successfully')
      setAvatarPreview(result.avatarUrl)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to upload avatar')
      setAvatarPreview(null)
    }
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setError(null)
      setSuccess(null)
      await profilesAPI.updateMyProfile(data)
      setSuccess('Profile updated successfully')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to update profile')
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setError(null)
      setSuccess(null)
      await profilesAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setSuccess('Password changed successfully')
      resetPassword()
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to change password')
    }
  }

  const handleToggleOTP = async () => {
    try {
      setError(null)
      setSuccess(null)
      const result = await profilesAPI.toggleOTP(!user?.isOtpEnabled)
      setSuccess(
        result.otpEnabled
          ? 'OTP enabled successfully. Check your email for the verification code.'
          : 'OTP disabled successfully',
      )
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to toggle OTP')
    }
  }

  const handleUnlinkAccount = async (provider: string) => {
    try {
      setError(null)
      setSuccess(null)
      await profilesAPI.unlinkProvider(provider.toLowerCase())
      setSuccess(`${provider} account unlinked successfully`)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to unlink account')
    }
  }

  if (!user) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const userRole = user.roles[0]?.name
  const isCaregiver = userRole === RoleName.CAREGIVER
  const isPatient = userRole === RoleName.PATIENT

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                {avatarPreview || user.profile?.avatarUrl ? (
                  <img
                    src={avatarPreview || user.profile?.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-slate-400">
                    {user.profile?.firstName?.[0]}
                    {user.profile?.lastName?.[0]}
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <Button type="button" variant="outline" asChild>
                  <span>Upload Avatar</span>
                </Button>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <p className="text-xs text-slate-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...registerProfile('firstName')}
                  disabled={isSubmittingProfile}
                />
                {profileErrors.firstName && (
                  <p className="text-sm text-red-600">{profileErrors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...registerProfile('lastName')}
                  disabled={isSubmittingProfile}
                />
                {profileErrors.lastName && (
                  <p className="text-sm text-red-600">{profileErrors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email} disabled />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1-555-0123"
                {...registerProfile('phone')}
                disabled={isSubmittingProfile}
              />
              {profileErrors.phone && (
                <p className="text-sm text-red-600">{profileErrors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                {...registerProfile('address')}
                disabled={isSubmittingProfile}
              />
              {profileErrors.address && (
                <p className="text-sm text-red-600">{profileErrors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...registerProfile('dateOfBirth')}
                disabled={isSubmittingProfile}
              />
              {profileErrors.dateOfBirth && (
                <p className="text-sm text-red-600">{profileErrors.dateOfBirth.message}</p>
              )}
            </div>

            {isCaregiver && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="Enter license number"
                    disabled={isSubmittingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    placeholder="e.g., Elderly Care, Pediatrics"
                    disabled={isSubmittingProfile}
                  />
                </div>
              </>
            )}

            {isPatient && (
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Input
                  id="medicalConditions"
                  placeholder="List any relevant medical conditions"
                  disabled={isSubmittingProfile}
                />
              </div>
            )}

            <Button type="submit" disabled={isSubmittingProfile}>
              {isSubmittingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication (OTP)</p>
                <p className="text-sm text-slate-600">
                  Add an extra layer of security to your account via email OTP
                </p>
              </div>
              <Badge variant={user.isOtpEnabled ? 'default' : 'secondary'}>
                {user.isOtpEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Button
              variant={user.isOtpEnabled ? 'destructive' : 'default'}
              onClick={handleToggleOTP}
            >
              {user.isOtpEnabled ? 'Disable OTP' : 'Enable OTP'}
            </Button>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('currentPassword')}
                  disabled={isSubmittingPassword}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('newPassword')}
                  disabled={isSubmittingPassword}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                )}
                <p className="text-xs text-slate-500">
                  Must be at least 8 characters with uppercase, lowercase, number, and special
                  character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('confirmPassword')}
                  disabled={isSubmittingPassword}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your OAuth connections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-slate-600">
                  {user.authProviders?.some((p) => p.provider === 'google')
                    ? 'Connected'
                    : 'Not connected'}
                </p>
              </div>
            </div>
            {user.authProviders?.some((p) => p.provider === 'google') ? (
              <Button variant="outline" size="sm" onClick={() => handleUnlinkAccount('Google')}>
                Unlink
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                Connect
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-sm text-slate-600">
                  {user.authProviders?.some((p) => p.provider === 'github')
                    ? 'Connected'
                    : 'Not connected'}
                </p>
              </div>
            </div>
            {user.authProviders?.some((p) => p.provider === 'github') ? (
              <Button variant="outline" size="sm" onClick={() => handleUnlinkAccount('GitHub')}>
                Unlink
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
