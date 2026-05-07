import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)', 
  '/docs(.*)',
  '/api/v1(.*)',
]);

export const proxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  
  // Set redirect after sign-in to dashboard
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
    // Clerk akan otomatis redirect ke dashboard setelah sign-in berhasil
    // karena sudah dikonfigurasi di Clerk dashboard
  }
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
