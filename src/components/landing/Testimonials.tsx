import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'

interface TestimonialProps {
  name: string
  role: string
  body: string
  avatar: string
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 10 10" fill="#FBBF24" aria-hidden>
      <path d="M5 0 L6.18 3.64 H10 L6.91 5.89 L8.09 9.53 L5 7.28 L1.91 9.53 L3.09 5.89 L0 3.64 H3.82 Z" />
    </svg>
  )
}

function TestimonialCard({ name, role, body, avatar }: TestimonialProps) {
  return (
    <div
      className="flex-shrink-0 w-[280px] lg:w-auto flex flex-col border border-[var(--line)] bg-bg-2 p-6 transition-colors hover:border-[var(--line-amber)]"
      style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} />)}
      </div>
      <p className="text-ink-0 mb-5 flex-1" style={{ fontSize: 15, lineHeight: 1.55 }}>
        &ldquo;{body}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0 border border-[var(--line)]" style={{ background: avatar }} />
        <div>
          <div className="text-[14px] font-semibold text-ink-0">{name}</div>
          <div className="font-mono text-ink-2 mt-0.5" style={{ fontSize: 10, letterSpacing: '0.04em' }}>{role}</div>
        </div>
      </div>
    </div>
  )
}

const testimonials: TestimonialProps[] = [
  { name: 'Léa M.',         role: '@lea.designs · TikTok',    body: "J'ai reçu mon vase Hive en 5 jours. La finition est dingue, le grain mat est exactement ce que j'attendais.", avatar: 'linear-gradient(135deg, #F59E0B, #7C2D12)' },
  { name: 'Studio Bouchet', role: 'Architecte d\'intérieur',  body: "On a fait 4 projets avec 3Bee. Réactivité bluffante, qualité au rendez-vous. Notre fournisseur 3D.", avatar: 'linear-gradient(135deg, #6366F1, #1E1B4B)' },
  { name: 'Tom V.',         role: 'Joueur d\'échecs',         body: "Le set Studio est juste magnifique. Pièces équilibrées, finition mate parfaite. Un cadeau qui marque.", avatar: 'linear-gradient(135deg, #10B981, #064E3B)' },
]

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mb-8">
          <div className="mb-3"><Eyebrow>Témoignages</Eyebrow></div>
          <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
            Ils nous font confiance.
          </h2>
        </Reveal>
        <Reveal delay={120} className="flex gap-4 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {testimonials.map((t) => <TestimonialCard key={t.name} {...t} />)}
        </Reveal>
      </div>
    </section>
  )
}
