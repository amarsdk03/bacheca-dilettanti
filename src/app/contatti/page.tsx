import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Contatti from "@/features/contatti/Contatti";
import {CONTACT_EMAIL_FALLBACK} from "@/const/contactConstants";
import {dynamicMetadata} from "@/server/metadata";
import type {Metadata} from "next";

export const metadata: Metadata = dynamicMetadata("Contatti");

export default function ContattiPage() {
	const emailStaff = process.env.CONTACT_EMAIL ?? CONTACT_EMAIL_FALLBACK;

	return <><Navbar /><Contatti emailStaff={emailStaff} /><Footer whiteBackground /></>;
}
