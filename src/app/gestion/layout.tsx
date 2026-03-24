'use client'

import SessionGuard from '@/components/SessionGuard'

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>
}
