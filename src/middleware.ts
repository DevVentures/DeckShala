import { auth } from "@/server/auth";
import { NextResponse, type NextRequest } from "next/server";
import { apiRateLimiter, authRateLimiter, SecurityHeaders } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  try {
    // Apply security headers
    const response = NextResponse.next();
    SecurityHeaders.apply(response);

    // Apply rate limiting
    const identifier =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";

    // Different rate limits for different routes
    if (request.nextUrl.pathname.startsWith("/api")) {
      const rateLimitResult = await apiRateLimiter.check(identifier);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many requests. Please try again later.",
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          },
          { status: 429 }
        );
      }
      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", "100");
      response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
      response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString());
    }

    // Auth routes get stricter rate limiting
    if (request.nextUrl.pathname.startsWith("/auth")) {
      const rateLimitResult = await authRateLimiter.check(identifier);
      if (!rateLimitResult.allowed) {
        logger.warn("Auth rate limit exceeded", { identifier, path: request.nextUrl.pathname });
        return NextResponse.json(
          {
            success: false,
            error: "Too many authentication attempts. Please try again later.",
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          },
          { status: 429 }
        );
      }
    }

    const session = await auth();
    const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

    // Always redirect from root to /presentation
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/presentation", request.url));
    }

    // If user is on auth page but already signed in, redirect to home page
    if (isAuthPage && session) {
      return NextResponse.redirect(new URL("/presentation", request.url));
    }

    // If user is not authenticated and trying to access a protected route, redirect to sign-in
    if (!session && !isAuthPage && !request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.redirect(
        new URL(
          `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`,
          request.url,
        ),
      );
    }

    return response;
  } catch (error) {
    logger.error("Middleware error", error as Error);
    return NextResponse.next();
  }
}

// Add routes that should be protected by authentication
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
