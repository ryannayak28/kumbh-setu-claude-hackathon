import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Brand from '@/components/Brand'

const Cop = lazy(() => import('@/modules/Cop'))
const Track = lazy(() => import('@/modules/Track'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex min-h-full items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-ink-dim)]">Loading Setu…</div>}>
        <Routes>
          <Route path="/" element={<Cop />} />
          <Route path="/track/:caseId" element={<Track />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <main className="flex min-h-full items-center justify-center bg-[var(--color-bg)] p-6 text-center">
      <div>
        <div className="mb-5 flex justify-center"><Brand compact /></div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">Check the link or return to the operating picture.</p>
        <a href="/" className="mt-4 inline-flex rounded-md bg-[var(--color-saffron)] px-4 py-2 text-sm font-semibold text-[#1a1206]">Return to Setu</a>
      </div>
    </main>
  )
}
