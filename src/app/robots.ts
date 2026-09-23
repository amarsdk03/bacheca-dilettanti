import type {MetadataRoute} from "next";

import {getSiteUrl} from "@/server/metadata";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/auth/",
				"/il-tuo-profilo",
				"/pubblica-annuncio/conferma",
				"/pubblica-annuncio/pagamento",
				"/reimposta-password",
				"/api/create-checkout-session",
				"/api/complete-checkout-session",
				"/api/stripe/",
			],
		},
		host: getSiteUrl(),
		sitemap: getSiteUrl("/sitemap.xml"),
	};
}
