import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <>
      {/* Navigation */}
      <nav
        className="
          sticky top-0 z-50 w-full
          flex items-center justify-center
          px-6 py-3
          bg-gradient-to-b from-black/40 to-black/10
          backdrop-blur-md
          border-b border-white/10"
      >
        <div className="flex items-center justify-between w-full max-w-8xl">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VeriFace Logo" className="h-14 w-auto" />
            <h1 className="text-2xl font-bold text-white/95">VeriFace</h1>
          </div>
          <div className="space-x-4">
            <a
              href="/sign-in"
              className="inline-block px-6 py-2 bg-white hover:bg-purple-600 hover:text-white text-purple-900 rounded-lg transition"
            >
              Sign-In
            </a>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-transparent overflow-x-hidden">
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

      <div>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8 bg-transparent px-6">
          <Card className="bg-gradient-to-b from-black/40 to-black/10">
            <CardHeader>
              <h2 className="text-3xl font-semibold text-white">Lorem ipsum</h2>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-gray-300">
                dolor sit amet consectetur adipiscing elit. Quisque faucibus ex
                sapien vitae pellentesque sem placerat. In id cursus mi pretium
                tellus duis convallis.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-black/40 to-black/10">
            <CardHeader>
              <h2 className="text-3xl font-semibold text-white">Lorem ipsum</h2>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-gray-300">
                dolor sit amet consectetur adipiscing elit. Quisque faucibus ex
                sapien vitae pellentesque sem placerat. In id cursus mi pretium
                tellus duis convallis.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-b from-black/40 to-black/10">
            <CardHeader>
              <h2 className="text-3xl font-semibold text-white">Lorem ipsum</h2>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-gray-300">
                dolor sit amet consectetur adipiscing elit. Quisque faucibus ex
                sapien vitae pellentesque sem placerat. In id cursus mi pretium
                tellus duis convallis.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
