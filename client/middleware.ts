import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Middleware logic
export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path === '/') {
        return NextResponse.redirect(new URL('/landing', request.nextUrl));
    }
}

// Matching paths for middleware
export const config = {
    matcher: [
        '/',           
        '/landing',
        '/dashboard'  
    ]
};