import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function HomePage() {
  // Check if user is authenticated by checking for access_token cookie
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')

  // If authenticated, redirect to dashboard
  if (accessToken?.value) {
    redirect('/dashboard')
  }

  // If not authenticated, redirect to login
  redirect('/login')
}
