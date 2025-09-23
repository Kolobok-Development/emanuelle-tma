import { COOKIE_NAME } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
    const cookie = cookies().get(COOKIE_NAME);

    if (!cookie) {}


    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    const jwt = cookie.value;

    try {
        const  { payload } = await jwtVerify(jwt, secret, {});


        if (!payload) {
            return NextResponse.redirect(new URL("/error", request.url));
        }

        return NextResponse.next(); 


    }catch(error){
        return NextResponse.redirect(new URL("/error", request.url));
    }
}

export const config = {
}