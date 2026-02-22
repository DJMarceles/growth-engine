"use client"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export default function SignInPage() {
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") ?? "/orgs"
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Sign in</h1>
        <p className="text-gray-500 text-sm mb-8">Connect with Meta to manage your ad accounts.</p>
        <button
          onClick={() => signIn("facebook", { callbackUrl })}
          className="w-full bg-[#1877F2] text-white py-3 rounded-lg font-medium hover:bg-[#166fe5] transition flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          Continue with Facebook / Meta
        </button>
        <p className="text-xs text-gray-400 mt-4 text-center">Requires ads_management and ads_read permissions.</p>
      </div>
    </div>
  )
}
