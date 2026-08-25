import { getTranslations } from 'next-intl/server'
import { supabase } from '@/lib/supabase'
import TestimonialsCarousel, { type Testimonial } from './TestimonialsCarousel'

export default async function Testimonials() {
  const t = await getTranslations('testimonials')

  const { data } = await supabase
    .from('testimonials')
    .select('id, name, role, body, avatar_gradient, display_order, source, rating, avatar_url, source_url, country')
    .eq('visible', true)
    .order('display_order', { ascending: true })

  const items: Testimonial[] = data ?? []

  return (
    <TestimonialsCarousel
      items={items}
      eyebrow={t('eyebrow')}
      heading={t('heading')}
      prevLabel={t('prev')}
      nextLabel={t('next')}
    />
  )
}
