"use client"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

const ERRORS: Record<string, string> = {
  OAuthCallback: "Meta returned an error. Check your app permissions in Meta Developer Console.",
  OAuthSignin: "Could not start the Meta sign-in flow. Check META_APP_ID and META_REDIRECT_URI.",
  AccessDenied: "You declined the required permissions. ads_management and ads_read are needed.",
  Default: "Something went wrong during sign-in.",
}

export default function AuthErrorPage() {
  const params = useSearchParams()
  const error = params.get("error") ?? "Default"
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2 text-red-600">Sign-in failed</h1>
        <p className="text-gray-600 text-sm mb-6">{ERRORS[error] ?? ERRORS.Default}</p>
        <p className="text-xs text-gray-400 mb-6 font-mono">Error code: {error}</p>
        <Link href="/auth/signin" className="block w-full text-center bg-gray-900 text-white py-2 rounded-lg text-sm">
          Try again
        </Link>
      </div>
    </div>
  )
}
