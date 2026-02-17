import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#5B21B6]" />

        <div className="absolute top-[35%] -left-24 h-[560px] w-[560px] rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[15%] h-[620px] w-[620px] rounded-full bg-indigo-200/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/25" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22180%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22180%22 height=%22180%22 filter=%22url(%23n)%22 opacity=%220.35%22/%3E%3C/svg%3E')]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full flex items-center justify-center px-6 py-1 bg-white/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between w-full max-w-7xl">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VeriFace Logo" className="h-14 w-auto" />
            <h1 className="text-2xl font-bold text-white/95">VeriFace</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-md">
              <a href="#" className="text-white/75 hover:text-white transition">
                Features
              </a>
              <a href="#" className="text-white/75 hover:text-white transition">
                Pricing
              </a>
              <a href="#" className="text-white/75 hover:text-white transition">
                About
              </a>
            </div>

            <a
              href="/sign-in"
              className="inline-block px-5 py-2 bg-purple-700 hover:bg-white/90 hover:text-purple-900 rounded-lg transition shadow-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-[92vh] px-6 -mt-[80px] pt-[96px] pb-16 ">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-[-10%] top-[20%] h-[5px] w-[120%] rotate-[-15deg] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="absolute left-[-10%] top-[60%] h-[2px] w-[120%] rotate-[-10deg] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="lg:pt-6">
            <div className="bg-white/10 border border-white/15 backdrop-blur-xl p-7 sm:p-9 rounded-2xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
              <h2 className="font-bold text-white mb-5 leading-[0.95] text-5xl sm:text-6xl lg:text-7xl xl:text-[84px]">
                Attendance,
                <br />
                Made Effortless.
              </h2>

              <p className="text-lg sm:text-xl text-white/85 mb-7 max-w-xl">
                Secure, accurate facial recognition that keeps check-ins fast
                and fraud-resistant — powered by privacy-conscious AI.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-white/80">
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="font-semibold text-white/90">Real-time</div>
                  <div>Instant check-in</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="font-semibold text-white/90">Secure</div>
                  <div>Encrypted & audited</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="font-semibold text-white/90">Integrates</div>
                  <div>API-first setup</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:translate-y-6">
            <div className="absolute inset-0 flex justify-center lg:justify-end">
              <div className="relative w-[360px] sm:w-[440px] lg:w-[520px]">
                <div className="absolute -inset-8 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-16 w-[70%] rounded-full bg-black/40 blur-2xl" />
              </div>
            </div>

            <img
              src="/kiosk4.png"
              alt="Kiosk Image"
              className="
                relative select-none
                w-full h-auto
                max-w-sm sm:max-w-md lg:max-w-lg
                drop-shadow-[0_25px_35px_rgba(0,0,0,0.35)]
                motion-safe:animate-[float_6s_ease-in-out_infinite]
              "
            />

            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
            `}</style>
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="px-6 -mt-6 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-[1px] bg-gradient-to-r from-white/25 via-white/10 to-white/25">
            <div className="relative overflow-hidden rounded-3xl bg-white/10 border border-white/10 backdrop-blur-2xl">
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-fuchsia-200/10 blur-3xl" />

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-6 py-6 sm:px-8 sm:py-7">
                {/* Left */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm text-white/85">
                      <span className="h-2 w-2 rounded-full bg-emerald-300/90" />
                      Now in pilot programs
                    </span>

                    <span className="text-sm text-white/70">
                      Built for schools, labs, and events
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-semibold text-white leading-tight">
                    Trusted attendance that scales — without slowing people
                    down.
                  </h3>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="text-lg font-semibold text-white">
                        {"<1s"}
                      </div>
                      <div className="text-sm text-white/70">Avg check-in</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="text-lg font-semibold text-white">
                        99.9%
                      </div>
                      <div className="text-sm text-white/70">Uptime target</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="text-lg font-semibold text-white">
                        Encrypted
                      </div>
                      <div className="text-sm text-white/70">Data at rest</div>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="text-lg font-semibold text-white">
                        API-first
                      </div>
                      <div className="text-sm text-white/70">
                        Easy integration
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col sm:flex-row gap-3 lg:justify-end shrink-0">
                  <a
                    href="#"
                    className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-white text-purple-900 font-semibold hover:bg-white/90 transition shadow-md"
                  >
                    Request a Demo
                  </a>
                  <a
                    href="#"
                    className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 transition"
                  >
                    View Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="px-6 mb-16">
        <div className="max-w-7xl mx-auto lg:px-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/10 border border-white/15 backdrop-blur-2xl rounded-2xl hover:bg-white/15 transition duration-300">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-white">
                  AI Identity Engine
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-white/85">
                  Real-time facial verification powered by adaptive machine
                  learning. Fast, accurate, and frictionless.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border border-white/15 backdrop-blur-2xl rounded-2xl hover:bg-white/15 transition duration-300">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-white">
                  Privacy by Design
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-white/85">
                  End-to-end encryption and ethical AI built to protect user
                  trust.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border border-white/15 backdrop-blur-2xl rounded-2xl hover:bg-white/15 transition duration-300">
              <CardHeader>
                <h2 className="text-2xl font-semibold text-white">
                  Seamless Integration
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-white/85">
                  API-first architecture built for web, mobile, and
                  enterprise-scale systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
