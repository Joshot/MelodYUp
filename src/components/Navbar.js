'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'

export default function Navbar() {
  const router = useRouter()
  const { user } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-[#1e1e2e] px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center text-sm font-bold">M</div>
          MelodYUp
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/library" className="text-[#64748b] hover:text-white text-sm transition">Library</Link>
            <Link href="/upload" className="text-[#64748b] hover:text-white text-sm transition">Upload</Link>
          </div>
        )}

        {user && (
          <div className="hidden md:flex items-center gap-3 relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user.email?.[0]?.toUpperCase()}
            </button>
            {dropdownOpen && (
              <div className="absolute top-10 right-0 bg-[#12121a] border border-[#1e1e2e] rounded-xl p-2 min-w-40 shadow-xl">
                <p className="text-xs text-[#64748b] px-3 py-1 truncate">{user.email}</p>
                <button onClick={handleLogout}
                  className="w-full text-left text-sm text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2 transition">Keluar</button>
              </div>
            )}
          </div>
        )}

        <button className="md:hidden text-[#64748b] hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && user && (
        <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-[#1e1e2e] pt-4">
          <Link href="/library" onClick={() => setMenuOpen(false)} className="block text-sm text-[#64748b] hover:text-white py-2 transition">Library</Link>
          <Link href="/upload" onClick={() => setMenuOpen(false)} className="block text-sm text-[#64748b] hover:text-white py-2 transition">Upload</Link>
          <button onClick={handleLogout} className="block text-sm text-red-400 py-2">Keluar</button>
        </div>
      )}
    </nav>
  )
}
