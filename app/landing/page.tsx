export const metadata = {
  title: "Landing",
  description: "Landing page",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-8">
      {/* Warning Triangle Icon */}
      <div className="mb-12 animate-pulse">
        <svg width="80" height="80" viewBox="0 0 80 80" className="fill-amber-400">
          <polygon points="40,10 70,65 10,65" />
          <circle cx="40" cy="45" r="3" fill="currentColor" className="fill-slate-900" />
          <rect x="38" y="35" width="4" height="8" fill="currentColor" className="fill-slate-900" />
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl w-full mb-12">
        {/* English Box */}
        <div className="flex-1 bg-slate-800/40 border border-amber-500/30 rounded-lg p-8 backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-amber-400 mb-6">Site Under Maintenance</h2>
          <p className="text-slate-300 text-lg mb-4">We're currently performing updates to improve your experience.</p>
          <p className="text-slate-300 text-lg mb-6">The site will be back online shortly.</p>

          {/* Status Box */}
          <div className="border border-amber-500/50 rounded-lg p-4 mb-6 bg-slate-900/20">
            <p className="text-amber-400 font-semibold text-center">Status: Maintenance in progress</p>
          </div>

          <p className="text-slate-400 text-sm mb-2">For urgent issues, contact us at:</p>
          <p className="text-amber-400 text-lg font-semibold">6301926@gmail.com</p>
        </div>

        {/* Hebrew Box */}
        <div className="flex-1 bg-slate-800/40 border border-amber-500/30 rounded-lg p-8 backdrop-blur-sm" dir="rtl">
          <h2 className="text-4xl font-bold text-amber-400 mb-6 text-right">האתר בתחזוקה</h2>
          <p className="text-slate-300 text-lg mb-4 text-right">אנו מבצעים כעת עדכונים לשיפור חווית המשתמש.</p>
          <p className="text-slate-300 text-lg mb-6 text-right">האתר יחזור לפעילות המלאה בקרוב.</p>

          {/* Status Box */}
          <div className="border border-amber-500/50 rounded-lg p-4 mb-6 bg-slate-900/20">
            <p className="text-amber-400 font-semibold text-center">סטטוס: תחזוקה פעילה</p>
          </div>

          <p className="text-slate-400 text-sm mb-2 text-right">לשאלות דחופות, צור איתנו קשר:</p>
          <p className="text-amber-400 text-lg font-semibold">6301926@gmail.com</p>
        </div>
      </div>

      {/* Hand Logo */}
      <div className="mt-auto pt-8">
        <img
          src="/images/kh-hand-logo.png"
          alt="KH Logo"
          className="h-20 w-20 opacity-80 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  )
}
