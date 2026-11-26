import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export default function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <main
      className={`container mx-auto px-4 py-6 max-w-5xl animate-fade-rise
        pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]
        md:pb-6 ${className}`}
    >
      {children}
    </main>
  )
}
