export default function StatusDot() {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
      style={{
        boxShadow: '0 0 0 3px rgba(52,211,153,0.18)',
        animation: 'pulse-dot 2.4s ease-in-out infinite',
      }}
    />
  )
}
