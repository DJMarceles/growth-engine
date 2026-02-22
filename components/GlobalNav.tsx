"use client"
import Link from "next/link"
import { signOut } from "next-auth/react"

export function GlobalNav({
  activePage,
  children,
}: {
  activePage?: "dashboard" | "orgs" | "projects"
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-white">
            Growth Engine
          </Link>
          <nav className="flex items-center gap-1 text-sm text-gray-400">
            <Link
              href="/orgs"
              className={`rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white ${activePage === "orgs" ? "bg-gray-800 text-white" : ""}`}
            >
              Organizations
            </Link>
            <Link
              href="/projects"
              className={`rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white ${activePage === "projects" ? "bg-gray-800 text-white" : ""}`}
            >
              Projects
            </Link>
            <Link
              href="/dashboard"
              className={`rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white ${activePage === "dashboard" ? "bg-gray-800 text-white" : ""}`}
            >
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 transition hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
