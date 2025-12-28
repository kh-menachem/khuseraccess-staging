"use client"
import Image from "next/image"

export default function MaintenanceLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0f172a" }}>
      <div className="w-full max-w-6xl">
        {/* Warning Triangle Icon */}
        <div className="flex justify-center mb-16">
          <svg className="w-24 h-24 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        </div>

        {/* Main Content Container - Better Left/Right Alignment */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* English Section - Left Side */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-amber-500/20 p-8 md:p-10 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold text-amber-400">Site Under Maintenance</h1>

              <div className="space-y-4 text-slate-300">
                <p className="text-base md:text-lg leading-relaxed">
                  We're currently performing updates<br>to improve your experience.
                </p>

                <p className="text-base md:text-lg leading-relaxed">The site will be back online shortly.</p>
              </div>

              {/* Status Badge */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 font-semibold text-center">Status: Maintenance in progress</p>
              </div>

              {/* Contact Section */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-2">For urgent issues, contact us at:</p>
                <a
                  href="mailto:6301926@gmail.com"
                  className="text-amber-400 font-semibold hover:text-amber-300 transition-colors text-lg"
                >
                  6301926@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Hebrew Section - Right Side */}
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-amber-500/20 p-8 md:p-10 flex flex-col justify-between h-full"
            dir="rtl"
          >
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold text-amber-400 text-right">האתר בתחזוקה</h1>

              <div className="space-y-4 text-slate-300 text-right">
                <p className="text-base md:text-lg leading-relaxed">אנו מבצעים כעת עדכונים <br>לשיפור חווית המשתמש.</p>

                <p className="text-base md:text-lg leading-relaxed">האתר יחזור לפעילות המלאה בקרוב.</p>
              </div>

              {/* Status Badge */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 font-semibold text-center">סטטוס: תחזוקה פעילה</p>
              </div>

              {/* Contact Section */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-2">לשאלות דחופות, אנא פנו אלינו:</p>
                <a
                  href="mailto:6301926@gmail.com"
                  className="text-amber-400 font-semibold hover:text-amber-300 transition-colors text-lg"
                  dir="ltr"
                >
                  6301926@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Logo at bottom */}
        <div className="flex justify-center mt-16">
          <div className="w-20 h-20 relative opacity-70 hover:opacity-100 transition-opacity">
            <Image
              src="/images/kh-hand-logo.png"
              alt="Keren Hatzedakah Hand Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}
