import Link from "next/link"
import { AuthShell } from "../components/auth-shell"
import { LoginForm } from "../form/login-form"

const Login = () => {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your restaurant."
      className="max-w-sm"
      footer={
        <>
          Don’t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}

export default Login
