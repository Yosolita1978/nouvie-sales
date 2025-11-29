import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar, Header } from '@/components/layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header userName={session.user.name} />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}