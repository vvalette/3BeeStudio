import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  linkClassName?: string
  asLink?: boolean
}

const sizes = {
  sm: { width: 32, height: 32 },
  md: { width: 44, height: 44 },
  lg: { width: 64, height: 64 },
}

export default function Logo({
  size = 'md',
  className,
  linkClassName,
  asLink = true,
}: LogoProps) {
  const { width, height } = sizes[size]

  const img = (
    <Image
      src="/images/logo.png"
      alt="3BeeStudio — Studio d'impression 3D"
      width={width}
      height={height}
      priority
      className={cn('object-contain', className)}
    />
  )

  if (!asLink) return img

  return (
    <Link
      href="/"
      aria-label="Retour à l'accueil 3BeeStudio"
      className={cn('flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md', linkClassName)}
    >
      {img}
    </Link>
  )
}
