import { COOKIE_NAME } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
    console.log("Middleware---->");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    const { pathname } = request.nextUrl;

    const routeConfig: Record<string, "*" | true> = {
        
        //API Routes
        "api/auth/authenticate-user": true, // Public - used for initial authentication
        "api/auth/me": "*", // Protected - requires JWT to get user data
        "api/companion/*": "*", // Protected - requires JWT to access companion data
      
        // Page Routes - these require authentication
        "/": "*",
        "dashboard": "*",
        "shop": "*",
        "tasks": "*",
        "profile": "*",
        

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
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie) {
        // Check if this is an API route
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        // For page routes, redirect to error page
        const url = request.nextUrl.clone();
        url.pathname = "/error";
        return NextResponse.redirect(url);
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
            const url = request.nextUrl.clone();
            url.pathname = "/error";
            return NextResponse.redirect(url);
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
        return NextResponse.redirect(new URL("/error", request.url));
    }
}

export const config = {
    matcher: [
      // Skip static files, Next.js internals, and auth API routes
      "/((?!_next/static|_next/image|favicon.ico).*)",
      // Include all API routes except auth
      "/api/((?!auth).*)",
    ],
  };