// Tiny API client for the FastAPI backend. The Vite dev server proxies /api.

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type Health = {
  status: string
  model: string
  model_ready: boolean
}

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(`Health check failed (${res.status})`)
  return res.json()
}

/**
 * Streams a Claude response from POST /api/chat, invoking `onToken` for each
 * text delta. Resolves when the stream ends; rejects on a server error event.
 */
export async function streamChat(
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  opts: { system?: string; signal?: AbortSignal } = {},
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: opts.system }),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      const parsed = JSON.parse(data) as { delta?: string; error?: string }
      if (parsed.error) throw new Error(parsed.error)
      if (parsed.delta) onToken(parsed.delta)
    }
  }
}
