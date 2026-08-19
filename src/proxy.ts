import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {updateSession} from "@/lib/supabase/proxy";

const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
	source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
	return destination;
}

// TODO: cambiare URL '/coming-soon' in '/in-manutenzione'
export default async function proxy(request: NextRequest) {
	const sessionResponse = await updateSession(request);

	if (MAINTENANCE_MODE) {
		return copyResponseCookies(
			sessionResponse,
			NextResponse.rewrite(new URL('/coming-soon', request.url)),
		);
	} else if (request.nextUrl.pathname === '/coming-soon') {
		return copyResponseCookies(
			sessionResponse,
			NextResponse.rewrite(new URL('/', request.url)),
		);
	}

	return sessionResponse;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|css|js|woff2?|ttf)$).*)',
	],
};
