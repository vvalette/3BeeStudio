import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminLogin from '@/components/admin/AdminLogin'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const isAuth = token === process.env.ADMIN_PASSWORD

  if (!isAuth) {
    return <AdminLogin />
  }

  redirect('/admin/commandes')
}
