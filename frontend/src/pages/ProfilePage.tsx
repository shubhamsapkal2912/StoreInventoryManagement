import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../api/client'
import { profileApi } from '../api/services'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Feedback'
import { TextAreaField, TextField } from '../components/ui/FormField'
import { Card, PageHeader } from '../components/ui/Layout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
})
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(72),
})

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', phone: user?.phone ?? '', address: user?.address ?? '' },
  })
  const password = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })

  const saveProfile = profile.handleSubmit(async (v) => {
    setProfileError(null)
    try {
      updateUser(await profileApi.update(v))
      toast.success('Profile updated')
    } catch (e) {
      setProfileError(errorMessage(e))
    }
  })

  const savePassword = password.handleSubmit(async (v) => {
    setPasswordError(null)
    try {
      await profileApi.changePassword(v.currentPassword, v.newPassword)
      password.reset()
      toast.success('Password changed')
    } catch (e) {
      setPasswordError(errorMessage(e))
    }
  })

  return (
    <>
      <PageHeader title="Profile" description="Manage your personal details and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Personal details">
          <form onSubmit={saveProfile} noValidate className="space-y-4 p-4" aria-label="Personal details">
            {profileError && <Alert>{profileError}</Alert>}
            <TextField label="Email" value={user?.email ?? ''} disabled readOnly hint="Your email is your sign-in name and cannot be changed here." />
            <TextField label="Full name" error={profile.formState.errors.fullName?.message} {...profile.register('fullName')} />
            <TextField label="Phone" type="tel" error={profile.formState.errors.phone?.message} {...profile.register('phone')} />
            <TextAreaField label="Address" error={profile.formState.errors.address?.message} {...profile.register('address')} />
            <Button type="submit" loading={profile.formState.isSubmitting}>Save changes</Button>
          </form>
        </Card>
        <Card title="Change password">
          <form onSubmit={savePassword} noValidate className="space-y-4 p-4" aria-label="Change password">
            {passwordError && <Alert>{passwordError}</Alert>}
            <TextField label="Current password" type="password" autoComplete="current-password" error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />
            <TextField label="New password" type="password" autoComplete="new-password" error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
            <Button type="submit" loading={password.formState.isSubmitting}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
