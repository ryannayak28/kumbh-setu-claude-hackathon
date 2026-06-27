import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Cop from '@/modules/Cop'
import Track from '@/modules/Track'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Cop />} />
        <Route path="/track/:caseId" element={<Track />} />
      </Routes>
    </BrowserRouter>
  )
}
