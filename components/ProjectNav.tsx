"use client"
import Link from "next/link"
import { signOut } from "next-auth/react"

const NAV_LINKS = [
  ["Dashboard", "dashboard"],
  ["Ads", "ads"],
  ["Experiments", "experiments"],
  ["Governance", "governance"],
  ["Pages", "pages"],
  ["Settings", "settings"],
] as const

export function ProjectNav({ projectId }: { projectId: string }) {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6 flex gap-6 h-12 items-center">
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-300">← Projects</Link>
        <div className="w-px h-4 bg-gray-700" />
        {NAV_LINKS.map(([label, slug]) => (
          <Link key={slug} href={`/projects/${projectId}/${slug}`} className="text-sm text-gray-400 hover:text-white">
            {label}
          </Link>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-500 hover:text-red-400 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
