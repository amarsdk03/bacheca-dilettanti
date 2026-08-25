import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {
	SITE_ACCESS_COOKIE,
	verifySiteAccessToken,
} from '@/lib/site-access';
import {updateSession} from '@/lib/supabase/proxy';

const MAINTENANCE_MODE =
	process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

const SITE_ACCESS_ENABLED =
	process.env.SITE_ACCESS_ENABLED === 'true';

/**
 * Mantiene i cookie aggiornati da Supabase quando dobbiamo
 * restituire una nostra response (redirect / rewrite).
 */
function copyResponseCookies(
	source: NextResponse,
	destination: NextResponse,
) {
	source.cookies.getAll().forEach((cookie) => {
		destination.cookies.set(cookie);
	});

	// @supabase/ssr può impostare header importanti per evitare
	// caching di risposte contenenti sessioni aggiornate.
	const headersToCopy = [
		'cache-control',
		'expires',
		'pragma',
	];

	headersToCopy.forEach((header) => {
		const value = source.headers.get(header);

		if (value) {
			destination.headers.set(header, value);
		}
	});

	return destination;
}

function isSafeInternalPath(value: string | null) {
	return (
		value !== null &&
		value.startsWith('/') &&
		!value.startsWith('//')
	);
}

export default async function proxy(request: NextRequest) {
	/*
	 * 1. Prima lasciamo sempre a Supabase la possibilità
	 *    di aggiornare la sessione/cookie.
	 */
	const sessionResponse = await updateSession(request);

	const {pathname, search} = request.nextUrl;

	/*
	 * 2. MAINTENANCE MODE
	 *
	 * Ha priorità assoluta sul password gate.
	 * Se il sito è in manutenzione, tutti vedono /coming-soon.
	 */
	if (MAINTENANCE_MODE) {
		if (pathname === '/coming-soon') {
			return sessionResponse;
		}

		return copyResponseCookies(
			sessionResponse,
			NextResponse.rewrite(
				new URL('/coming-soon', request.url),
			),
		);
	}

	/*
	 * 3. PASSWORD GATE
	 */
	if (SITE_ACCESS_ENABLED) {
		const token = request.cookies.get(
			SITE_ACCESS_COOKIE,
		)?.value;

		const hasAccess =
			await verifySiteAccessToken(token);

		/*
		 * La pagina dove inserire la password deve
		 * essere raggiungibile senza password.
		 */
		if (pathname === '/accesso') {
			/*
			 * Se ha già sbloccato il sito, non ha senso
			 * mostrargli nuovamente la pagina di accesso.
			 */
			if (hasAccess) {
				const next =
					request.nextUrl.searchParams.get('next');

				const destination =
					isSafeInternalPath(next)
						? next!
						: '/';

				return copyResponseCookies(
					sessionResponse,
					NextResponse.redirect(
						new URL(destination, request.url),
					),
				);
			}

			return sessionResponse;
		}

		/*
		 * Route che devono poter funzionare anche prima
		 * di aver inserito la password del sito.
		 *
		 * Aggiungi qui SOLO quelle effettivamente esistenti.
		 */
		const publicRoutes = [
			'/auth/confirm',
		];

		const isPublicRoute = publicRoutes.some(
			(route) =>
				pathname === route ||
				pathname.startsWith(`${route}/`),
		);

		if (isPublicRoute) {
			return sessionResponse;
		}

		/*
		 * Nessun cookie valido:
		 * mandiamo l'utente alla pagina /accesso.
		 */
		if (!hasAccess) {
			const accessUrl = request.nextUrl.clone();

			accessUrl.pathname = '/accesso';
			accessUrl.search = '';

			accessUrl.searchParams.set(
				'next',
				`${pathname}${search}`,
			);

			return copyResponseCookies(
				sessionResponse,
				NextResponse.redirect(accessUrl),
			);
		}
	}

	/*
	 * 4. Se NON siamo più in maintenance mode,
	 *    /coming-soon non deve essere direttamente raggiungibile.
	 *
	 * Questo controllo viene fatto DOPO il password gate
	 * per evitare un possibile bypass.
	 */
	if (pathname === '/coming-soon') {
		return copyResponseCookies(
			sessionResponse,
			NextResponse.redirect(
				new URL('/', request.url),
			),
		);
	}

	/*
	 * 5. Tutto OK:
	 *    continua normalmente con la response Supabase.
	 */
	return sessionResponse;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|css|js|woff2?|ttf)$).*)',
	],
};