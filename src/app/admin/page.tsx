import { redirect } from 'next/navigation'
import AdminLogin from '@/components/admin/AdminLogin'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    return <AdminLogin />
  }

  redirect('/admin/commandes')
}
