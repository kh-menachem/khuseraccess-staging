export const metadata = {
  title: "Landing",
  description: "Landing page",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-6">Welcome</h1>
        <p className="text-xl text-slate-300 mb-8">
          Discover our customer portal with comprehensive transaction tracking and account management.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition"
          >
            Customer Login
          </a>
          <a
            href="/admin/login"
            className="px-8 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition"
          >
            Admin Login
          </a>
        </div>
      </div>
    </div>
  )
}
