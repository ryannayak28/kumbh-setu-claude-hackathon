import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import { getHealth, streamChat, type ChatMessage, type Health } from '@/lib/api'

const EXAMPLES = [
  'Summarize the Kumbh Mela 2027 crowd-safety challenge in 3 bullets.',
  'Brainstorm 5 civic problems affecting pilgrims at scale.',
  'Draft a 30-second demo pitch for a crowd-flow app.',
]

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming) return
    setError(null)
    setInput('')

    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setStreaming(true)

    try {
      await streamChat(next, (delta) => {
        setMessages((cur) => {
          const copy = [...cur]
          copy[copy.length - 1] = {
            role: 'assistant',
            content: copy[copy.length - 1].content + delta,
          }
          return copy
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMessages((cur) => cur.slice(0, -1)) // drop the empty assistant bubble
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-indigo-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Claude Impact Lab</h1>
              <p className="text-xs text-slate-400">Kumbh Mela 2027 · starter kit</p>
            </div>
          </div>
          <HealthBadge health={health} />
        </div>
      </header>

      {/* Messages */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onPick={send} disabled={streaming} />
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <Bubble key={i} message={m} streaming={streaming && i === messages.length - 1} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      <footer className="border-t border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-indigo-400/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              rows={1}
              placeholder="Ask Claude anything… (Enter to send, Shift+Enter for newline)"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={streaming || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HealthBadge({ health }: { health: Health | null }) {
  const ready = health?.model_ready
  const color = health == null ? 'bg-slate-500' : ready ? 'bg-emerald-400' : 'bg-amber-400'
  const label =
    health == null ? 'backend offline' : ready ? health.model : 'no API key'
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </div>
  )
}

function EmptyState({ onPick, disabled }: { onPick: (t: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-xl shadow-indigo-500/30">
        <Sparkles className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Your Claude-powered starting point</h2>
        <p className="mt-1 text-sm text-slate-400">
          Streaming works end-to-end. Swap the prompt and build your solution.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onPick(ex)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-indigo-400/50 hover:bg-white/10 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? 'bg-indigo-500/80' : 'bg-white/10'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-500 text-white'
            : 'border border-white/10 bg-white/5 text-slate-100'
        }`}
      >
        {message.content || (streaming && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />)}
      </div>
    </motion.div>
  )
}

export default App
