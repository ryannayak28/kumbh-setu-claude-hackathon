type BrandProps = {
  compact?: boolean
  inverse?: boolean
  subtitle?: string
}

export default function Brand({ compact = false, inverse = false, subtitle }: BrandProps) {
  const ink = inverse ? '#172033' : 'var(--color-ink)'
  const sub = inverse ? '#5d6675' : 'var(--color-ink-dim)'
  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="कुंभ Setu">
      <span
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-saffron)]"
        aria-hidden="true"
      >
        <span className="absolute inset-x-1 bottom-1 h-2 rounded-full bg-[#11100c]/10" />
        <svg viewBox="0 0 40 40" className="relative h-7 w-7">
          <path d="M7 25.5c3.6-10.8 22.4-10.8 26 0" fill="none" stroke="#11100c" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M11.5 25.8h17" fill="none" stroke="#11100c" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="7" cy="25.5" r="3.4" fill="#11100c" />
          <circle cx="33" cy="25.5" r="3.4" fill="#11100c" />
          <path d="M20 12v5.5" stroke="#11100c" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2 whitespace-nowrap font-extrabold tracking-[-0.02em]" style={{ color: ink }}>
          <span className={compact ? 'text-[19px]' : 'text-[22px]'} style={{ fontFamily: 'var(--font-deva)' }}>कुंभ</span>
          <span className={compact ? 'text-lg' : 'text-xl'}>Setu</span>
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: sub }}>{subtitle}</span>}
      </span>
    </div>
  )
}
