import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neo-bg text-neo-text font-sans p-8 md:p-16 selection:bg-neo-yellow">
      <nav className="flex justify-between items-center mb-24 border-b-4 border-black pb-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter">PathFinder</h1>
        <div className="flex gap-4">
          <Link href="/sign-in" className="text-xl font-bold uppercase border-4 border-transparent hover:border-black px-4 py-2 transition-all">Login</Link>
          <Link href="/sign-up" className="text-xl font-bold uppercase bg-neo-yellow border-4 border-black shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 px-4 py-2 transition-all">Start Now</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto flex flex-col gap-32">
        {/* Hero Section */}
        <section className="text-center flex flex-col items-center gap-8">
          <h2 className="text-6xl md:text-8xl font-black uppercase leading-tight bg-neo-yellow inline-block px-4 border-4 border-black shadow-brutal">
            Stop Guessing. <br/> Start Knowing.
          </h2>
          <p className="text-2xl md:text-3xl font-bold max-w-3xl border-l-8 border-black pl-6 text-left">
            An AI-native learning platform where the curriculum adapts to your real gaps, not your symptoms.
          </p>
          <div className="mt-8">
            <Link href="/sign-up" className="inline-block text-2xl font-black uppercase bg-neo-blue text-white border-4 border-black shadow-brutal-lg hover:shadow-brutal-active hover:translate-y-2 hover:translate-x-2 px-8 py-4 transition-all">
              Build Your Path
            </Link>
          </div>
        </section>

        {/* Differentiators Section */}
        <section className="grid md:grid-cols-2 gap-12">
          {/* Readiness vs Progress */}
          <div className="bg-neo-green border-4 border-black shadow-brutal p-8 flex flex-col gap-6">
            <h3 className="text-4xl font-black uppercase">Readiness, Not a Progress Bar</h3>
            <p className="text-xl font-bold bg-white border-4 border-black p-4">
              Generic MOOCs give you a 100% progress bar for watching videos. We give you a Readiness % based on verified micro-assessments. Don't just click through—prove it.
            </p>
          </div>

          {/* Root-cause diagnosis */}
          <div className="bg-neo-red text-white border-4 border-black shadow-brutal p-8 flex flex-col gap-6">
            <h3 className="text-4xl font-black uppercase">Diagnose the Cause, Not the Symptom</h3>
            <p className="text-xl font-bold bg-black text-white p-4">
              If you fail an API design task, we don't serve you an easier API task. We walk back the prerequisite graph to find out if you actually forgot HTTP methods, and fix the root cause.
            </p>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-neo-blue border-4 border-black shadow-brutal p-12 text-center text-white flex flex-col items-center gap-8">
          <h2 className="text-5xl font-black uppercase">Your Goal. Your Timeline.</h2>
          <p className="text-2xl font-bold max-w-2xl">
            Declare your target role and weekly hours. The AI planner builds a deterministic skill graph tailored to your exact time budget.
          </p>
          <Link href="/sign-up" className="mt-4 text-2xl font-black uppercase bg-neo-yellow text-black border-4 border-black shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 px-8 py-4 transition-all">
            Get Started For Free
          </Link>
        </section>
      </main>
    </div>
  );
}
