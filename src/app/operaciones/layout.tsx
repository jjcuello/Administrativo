'use client'

import SessionGuard from '@/components/SessionGuard'

export default function OperacionesLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>
}
