import { clerkMiddleware } from '@clerk/nextjs/server';

// Prefix matches, so nested and sibling routes (`/agents/new`, `/runs/x`)
// are covered without listing each one.
const PROTECTED = /^\/(chat|agents|runs|structured|stats)(.*)$/;

export default clerkMiddleware(async (auth, req) => {
  if (PROTECTED.test(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
