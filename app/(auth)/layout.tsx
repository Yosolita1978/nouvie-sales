export default function AuthLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {/* Center the login form on screen */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    )
  }