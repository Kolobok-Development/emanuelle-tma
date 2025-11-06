import { COOKIE_NAME } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
    console.log("Middleware---->");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);


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
        return NextResponse.next();
      }

    const routeConfig: Record<string, "*" | true> = {
        
        //API Routes
        "/api/auth/authenticate-user": true, // Public - used for initial authentication
        "/api/auth/me": "*", // Protected - requires JWT to get user data
        "/api/bot/webhook": true, // Public - used for webhook
        "/api/companion/*": "*", // Protected - requires JWT to access companion data
      
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

    console.log("Matched Config---->", matchedConfig);

    if (matchedConfig === null) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (matchedConfig === true) {
        return NextResponse.next();
    }

    // For routes that require authentication (matchedConfig === "*")
    console.log("Cookie Store---->");
    const cookie = request.cookies.get(COOKIE_NAME);;

    if (!cookie) {
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
        console.log("JWT Verifying---->");
        const  { payload } = await jwtVerify(jwt, secret, {});

        console.log("Payload---->", payload);

        if (!payload) {
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

        console.log("JWT verified---->");
        return NextResponse.next(); 

    } catch(error) {
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