'use client'

import SessionGuard from '@/components/SessionGuard'

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>
}
