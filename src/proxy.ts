import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

export default function proxy(request: NextRequest) {
	if (MAINTENANCE_MODE) {
		return NextResponse.rewrite(new URL('/coming-soon', request.url));
	} else if (request.nextUrl.pathname === '/coming-soon') {
		return NextResponse.rewrite(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|css|js|woff2?|ttf)$).*)',
	],
};