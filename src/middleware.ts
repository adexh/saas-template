import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/","/api/webhook/register", "/sign-in", "/sign-up"]);
const isUserRoute = createRouteMatcher(["/dashboard"]);
const isAdminRoute = createRouteMatcher(["/admin/dashboard"]);

export default clerkMiddleware( async (auth, req) => {  
  const { has, sessionId } = await auth();
  
  if( !sessionId && !isPublicRoute(req) ) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if( sessionId ) {
    try {
      // If user is signed-in, but not admin, fallback to dashboard
      if( isAdminRoute(req) && !has({ permission: "org:admin" }) ) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }

      // Redirect admin to admin dashboard
      if( has({ permission: "org:admin" }) && isUserRoute(req) ) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }

      // If user is signed-in, dont allow user to access public urls
      if( isPublicRoute(req) ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch (error) {
      console.error("Error fetching user data from Clerk:", error);
      return NextResponse.redirect(new URL("/error", req.url));
    }
  }

})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}