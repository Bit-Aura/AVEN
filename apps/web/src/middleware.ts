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
        const authCtx = await auth();
        const { userId, sessionClaims } = authCtx;
        
        if (!userId) {
          const signInUrl = new URL('/sign-in', req.url);
          signInUrl.searchParams.set('redirect_url', req.url);
          return NextResponse.redirect(signInUrl);
        }

        // Server-side RBAC enforcement
        const role = (sessionClaims?.metadata as any)?.role?.toUpperCase() || 'LEARNER';
        
        if (path.startsWith('/admin') && role !== 'ADMIN') {
          return NextResponse.redirect(new URL(role === 'MENTOR' ? '/mentor' : '/learner', req.url));
        }
        
        if (path.startsWith('/mentor') && role === 'LEARNER') {
          return NextResponse.redirect(new URL('/learner', req.url));
        }
        
        if (path.startsWith('/learner') && role === 'MENTOR') {
          return NextResponse.redirect(new URL('/mentor', req.url));
        }
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

