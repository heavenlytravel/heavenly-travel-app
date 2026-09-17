import { clerkMiddleware } from "@clerk/nextjs/server";

// Only attaches the Clerk session to requests. Route protection is done per
// page with `getAccess` from @repo/db/server, never here.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
