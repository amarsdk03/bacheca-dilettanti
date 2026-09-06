import {Inter, Lato, Oswald} from "next/font/google";

export const interFont = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const oswaldFont = Oswald({
	subsets: ["latin"],
	variable: "--font-oswald",
});

export const latoFont = Lato({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-lato",
});
