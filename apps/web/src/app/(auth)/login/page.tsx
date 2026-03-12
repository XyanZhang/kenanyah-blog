import { LoginForm } from '@/components/auth'

export default function LoginPage() {
  return (
    <div className="bg-surface-primary/90 backdrop-blur-sm rounded-xl shadow-xl p-8 w-full max-w-sm">
      <LoginForm />
    </div>
  )
}