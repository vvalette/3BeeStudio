import Link from 'next/link'
import SiteFooter from '@/components/landing/SiteFooter'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-0 text-ink-0">

      {/* ── Header ── */}
      <div className="relative overflow-hidden border-b border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
        {/* Halo ambre */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 w-full"
          style={{
            height: 240,
            background: 'radial-gradient(ellipse at 20% 0%, rgba(245,158,11,0.08), transparent 60%)',
          }}
        />
        {/* Motif lignes */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 80px)',
          }}
        />

        <div className="relative mx-auto max-w-3xl px-5 sm:px-8 pt-8 pb-12">
          {/* Retour */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-ink-3 transition-colors hover:text-ink-1"
            style={{ fontSize: 13 }}
          >
            <BackIcon />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em]">Accueil</span>
          </Link>

          <h1
            className="mt-6 font-sans font-bold text-ink-0"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}
          >
            {title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--line-2)]" />
            <p className="font-mono text-ink-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
              Mise à jour · {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-14">
        <div className="legal-content">
          {children}
        </div>
      </div>

      <SiteFooter />

      <style>{`
        .legal-content h2 {
          font-family: var(--font-sans);
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: #FAFAFA;
          margin-top: 3rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .legal-content h2::before {
          content: '';
          display: block;
          width: 3px;
          height: 1.1em;
          border-radius: 99px;
          background: linear-gradient(180deg, #FBBF24, #F59E0B);
          flex-shrink: 0;
        }
        .legal-content h3 {
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 600;
          color: #C9C9CE;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .legal-content p {
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink-2);
          margin-bottom: 1rem;
        }
        .legal-content ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .legal-content ul li {
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink-2);
          padding-left: 1.5rem;
          position: relative;
        }
        .legal-content ul li::before {
          content: '·';
          position: absolute;
          left: 0.25rem;
          color: var(--amber);
          font-weight: 700;
          font-size: 18px;
          line-height: 1.2;
        }
        .legal-content strong {
          color: var(--ink-1);
          font-weight: 600;
        }
        .legal-content a {
          color: var(--amber);
          text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.35);
          transition: border-color 150ms;
        }
        .legal-content a:hover {
          border-color: var(--amber);
        }
        .legal-content .info-box {
          background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02));
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin: 0.5rem 0 2rem;
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink-1);
        }
        .legal-content .info-box strong {
          color: var(--ink-0);
        }
        .legal-content .info-box a {
          color: var(--amber-soft);
          border-bottom-color: rgba(251,191,36,0.3);
        }
      `}</style>
    </div>
  )
}
