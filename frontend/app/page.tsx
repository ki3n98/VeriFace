import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <>
      {/* Navigation */}
      <nav
        className="
          sticky top-0 z-50 w-full
          flex items-center justify-center
          px-6 py-1
          bg-gradient-to-b from-white/40 to-white/10
          backdrop-blur-md
          shadow-md"
      >
        <div className="flex items-center justify-between w-full max-w-8xl">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VeriFace Logo" className="h-14 w-auto" />
            <h1 className="text-2xl font-bold text-white/95">VeriFace</h1>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* Plain Links (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-6 text-md">
              <a href="#" className="text-white/70 hover:text-white transition">
                Features
              </a>
              <a href="#" className="text-white/70 hover:text-white transition">
                Pricing
              </a>
              <a href="#" className="text-white/70 hover:text-white transition">
                About
              </a>
            </div>

            {/* Sign In Button */}
            <a
              href="/sign-in"
              className="inline-block px-5 py-2 bg-white hover:bg-purple-600 hover:text-white text-purple-900 rounded-lg transition"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen px-6 -mt-[80px] pt-[80px] py-20">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div className="text-left bg-gradient-to-b from-white/40 to-white/10 p-8 rounded-lg">
            <h2 className="text-8xl md:text-6xl font-bold text-white mb-6">
              Attendance Made Easy
            </h2>
            <p className="text-xl text-white mb-8">
              Secure and accurate facial recognition for everyone, <br />
              powered by AI facial recognition.
            </p>
          </div>

          {/* Image */}
          <div className="flex justify-center md:justify-end drop-shadow-lg">
            <img
              src="/kiosk4.png"
              alt="Kiosk Image"
              className="
                w-full h-auto
                max-w-sm sm:max-w-md md:max-w-lg
                select-none
              "
            />
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-transparent px-6">
        <Card className="bg-gradient-to-b from-white/40 to-white/10">
          <CardHeader>
            <h2 className="text-3xl font-semibold text-white">
              AI Identity Engine
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light text-white">
              Real-time facial verification powered by adaptive machine
              learning. Fast, accurate, and frictionless.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-white/40 to-white/10">
          <CardHeader>
            <h2 className="text-3xl font-semibold text-white">
              Privacy by Design
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light text-white">
              End-to-end encryption and ethical AI built to protect user trust.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-white/40 to-white/10">
          <CardHeader>
            <h2 className="text-3xl font-semibold text-white">
              Seamless Integration
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-light text-white">
              API-first architecture built for web, mobile, and enterprise-scale
              systems.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
