import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/","/api/webhook/register", "/sign-in", "/sign-up"]);
const isUserRoute = createRouteMatcher(["/dashboard", "/api/todos"]);
const isAdminRoute = createRouteMatcher(["/admin/dashboard"]);

export default clerkMiddleware( async (auth, req) => {  
  const { sessionId, userId } = await auth();
  const client = await clerkClient();
  
  if( !sessionId && !isPublicRoute(req) ) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if( sessionId ) {
    try {
      // If user is signed-in, but not admin, fallback to dashboard
      const { role } = (await client.users?.getUser(userId)).privateMetadata;

      if( isAdminRoute(req) && role !== "admin" ) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }

      // Redirect admin to admin dashboard
      if( role === "admin" && isUserRoute(req) ) {
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