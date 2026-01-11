import { COOKIE_NAME } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";


export async function middleware(request: NextRequest) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const startTime = Date.now();


    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith("/_next") ||                 // build files
        pathname.startsWith("/bg/") ||                   // your masks/images under /public/bg
        pathname.startsWith("/locales/") ||              // i18n json
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" ||
        /\.[a-z0-9]+$/i.test(pathname)                   // any /file.ext (png, webp, css, js, etc.)
      ) {
        const response = NextResponse.next();
        if (process.env.NODE_ENV === 'development' && pathname.startsWith("/_next")) {
          const origin = request.headers.get("origin");
          if (origin && origin.includes("ngrok")) {
            response.headers.set("Access-Control-Allow-Origin", origin);
            response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type");
          }
        }
        return response;
      }

    const routeConfig: Record<string, "*" | true> = {
        
        //API Routes
        "/api/auth/authenticate-user": true, // Public - used for initial authentication
        "/api/auth/me": true, // Protected - requires JWT to get user data
        "/api/bot/webhook": true, // Public - used for webhook
        "/api/companion/*": "*", // Protected - requires JWT to access companion data
        "/api/offers": "*", // Protected - requires JWT to get offers
        "/api/payment/create-invoice": "*", // Protected - requires JWT to create payments
        "/api/payment/webhook": true, // Public - used for webhook
        "/api/profile/*": "*", // Protected - requires JWT to update profile
        "/api/metrics": true, // Public - used for metrics
      
        // Page Routes - these require authentication
        "/": true,
        "/dashboard": "*",
        "/companion/*": "*",
        "/shop": "*",
        "/tasks": "*",
        "/profile": "*",
        "/balance": "*",
        

    }

    const matchRoute = (pathname: string, pattern: string ) => {
        return pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -2)) : pathname === pattern;
    }

    let matchedConfig: "*" | true | null = null;

    for (const [pattern, config] of Object.entries(routeConfig)) {
        if (matchRoute(pathname, pattern)) {
            matchedConfig = config;
            break;
        }
    }


    if (matchedConfig === null) {
        globalThis?.logger?.debug({ pathname }, 'Route not matched, redirecting to home');
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (matchedConfig === true) {
        globalThis?.logger?.debug({ pathname, duration: Date.now() - startTime }, 'Public route, allowing access');
        return NextResponse.next();
    }

    // For routes that require authentication (matchedConfig === "*")
    const cookie = request.cookies.get(COOKIE_NAME);

    if (!cookie) {
        globalThis?.logger?.warn({ pathname }, 'No authentication cookie found');
        // Check if this is an API route
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        // For page routes, redirect to error page
        return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const jwt = cookie.value;

    try {
        const { payload } = await jwtVerify(jwt, secret, {});

        if (!payload) {
            globalThis?.logger?.warn({ pathname }, 'Invalid JWT payload');
            // Check if this is an API route
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Invalid session token' },
                    { status: 401 }
                );
            }
            // For page routes, redirect to error page
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        globalThis?.logger?.debug({ 
            pathname, 
            userId: payload.sub,
            duration: Date.now() - startTime
        }, 'Authentication successful');
        return NextResponse.next(); 

    } catch(error) {
        globalThis?.logger?.warn({ 
            pathname,
            error: error instanceof Error ? error.message : String(error)
        }, 'JWT verification failed');
        // Check if this is an API route
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Authentication failed' },
                { status: 401 }
            );
        }
        // For page routes, redirect to error page
        return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
}

export const config = {
    matcher: [
      // Skip static files, Next.js internals, and auth API routes
      "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
  };