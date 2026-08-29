import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const secretKey = process.env.CLERK_SECRET_KEY || "";

const isRealClerkKey = Boolean(
  publishableKey &&
  secretKey &&
  publishableKey.startsWith("pk_") &&
  publishableKey.length > 25 &&
  !publishableKey.includes("placeholder") &&
  !publishableKey.includes("dummy") &&
  !publishableKey.includes("ZGVtby") &&
  !secretKey.includes("placeholder") &&
  !secretKey.includes("dummy")
);

const isProtectedRoute = createRouteMatcher([
  '/learner(.*)',
  '/mentor(.*)',
  '/admin(.*)',
  '/diagnostic(.*)',
]);

export default isRealClerkKey
  ? clerkMiddleware(async (auth, req) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith('/diagnostic') || isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

