export default function Home() {
  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full flex items-center justify-center px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between w-full max-w-7xl">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VeriFace Logo" className="h-14 w-auto" />
            <h1 className="text-2xl font-bold text-white">VeriFace</h1>
          </div>
          <div className="space-x-4">
            <a
              href="/sign-up"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
            >
              Sign-Up
            </a>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-x-hidden">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen px-6 -mt-[80px] pt-[80px]">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Attendance Made Easy
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Secure and accurate facial recognition for everyone, <br />
              powered by AI facial recognition.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
