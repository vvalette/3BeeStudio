import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AdminBoutiqueProductForm from '@/components/admin/AdminBoutiqueProductForm'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiqueNouveauPage() {
  if (!(await isAuthenticated())) redirect('/admin')
  return <AdminBoutiqueProductForm />
}
