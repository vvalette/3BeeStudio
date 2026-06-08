import SiteFooter from '@/components/landing/SiteFooter'

interface LegalLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-0 text-ink-0">
      {/* Header */}
      <div className="border-b border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-10 pb-12">

          <h1 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {title}
          </h1>
          <p className="font-mono text-ink-3 mt-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            Mise à jour : {lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-14">
        <div className="legal-content">
          {children}
        </div>
      </div>

      <SiteFooter />

      <style>{`
        .legal-content h2 {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.015em;
          color: #FAFAFA;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--line);
        }
        .legal-content h3 {
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 600;
          color: #C9C9CE;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .legal-content p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-2);
          margin-bottom: 0.75rem;
        }
        .legal-content ul {
          list-style: none;
          padding: 0;
          margin-bottom: 0.75rem;
        }
        .legal-content ul li {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-2);
          padding-left: 1.25rem;
          position: relative;
          margin-bottom: 0.25rem;
        }
        .legal-content ul li::before {
          content: '·';
          position: absolute;
          left: 0;
          color: var(--amber);
          font-weight: 700;
        }
        .legal-content strong {
          color: var(--ink-1);
          font-weight: 600;
        }
        .legal-content a {
          color: var(--amber);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .legal-content .info-box {
          background: var(--bg-2);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin: 1rem 0;
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-1);
        }
      `}</style>
    </div>
  )
}
