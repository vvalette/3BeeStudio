import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AdminCustomOrderNew from '@/components/admin/AdminCustomOrderNew'

export const dynamic = 'force-dynamic'

export default async function AdminSurMesureNouveauPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  return <AdminCustomOrderNew />
}
