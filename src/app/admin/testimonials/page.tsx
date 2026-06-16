import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import AdminTestimonialsList from '@/components/admin/AdminTestimonialsList'

export const dynamic = 'force-dynamic'

export default async function AdminTestimonialsPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const { data } = await supabaseAdmin
    .from('testimonials')
    .select('*')
    .order('display_order', { ascending: true })

  return <AdminTestimonialsList initialItems={data ?? []} />
}
