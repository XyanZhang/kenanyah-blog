import { SetupProfileForm } from '@/components/auth'

export default function SetupProfilePage() {
  return (
    <div className="bg-surface-primary/90 backdrop-blur-sm rounded-xl shadow-xl p-8 w-full max-w-sm">
      <SetupProfileForm />
    </div>
  )
}