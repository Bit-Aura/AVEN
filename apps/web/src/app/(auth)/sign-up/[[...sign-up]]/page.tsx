import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerkSafe";
import Link from "next/link";

export default function Page() {
  if (!isClerkConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white p-4">
        <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4 shadow-xl">
          <h2 className="text-xl font-bold">Local Development Mode</h2>
          <p className="text-sm text-slate-400">
            Clerk is not configured. Running seamlessly with local demo account.
          </p>
          <Link
            href="/diagnostic"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Start Diagnostic Assessment →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/diagnostic" />
    </div>
  );
}
