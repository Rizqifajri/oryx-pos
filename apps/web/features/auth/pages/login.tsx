import Image from "next/image"
import { LoginForm } from "../form/login-form"
import oryxApps from "@/app/assets/logo/logo.jpeg"

const Login = () => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <Image src={oryxApps} alt="oryx-apps" width={500} height={500} className="w-full h-56" />
      <div className="w-full space-y-6 p-6 border">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

export default Login
