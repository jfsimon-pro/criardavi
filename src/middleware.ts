import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    console.log('🔒 Middleware called for:', pathname);

    // Public routes that don't require authentication
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/criar-conta') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname === '/'
    ) {
        console.log('✅ Public route, allowing access');
        return NextResponse.next();
    }

    console.log('🔐 Protected route, checking authentication...');

    // Get token to check authentication
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    console.log('🎫 Token:', token ? 'FOUND' : 'NOT FOUND');

    // Not authenticated - redirect to login
    if (!token) {
        console.log('❌ No token, redirecting to /login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // User is authenticated - check role-based access
    const userRole = token.role as string;
    console.log('👤 User role:', userRole);

    // Admin trying to access atendente routes
    if (pathname.startsWith('/atendente') && userRole === 'ADMIN') {
        console.log('⚠️ Admin trying to access atendente route, redirecting');
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Atendente trying to access admin routes  
    if (pathname.startsWith('/admin') && userRole === 'ATENDENTE') {
        console.log('⚠️ Atendente trying to access admin route, redirecting');
        return NextResponse.redirect(new URL('/atendente/dashboard', request.url));
    }

    console.log('✅ Access granted');
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
