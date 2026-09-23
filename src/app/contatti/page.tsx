import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Contatti from "@/features/contatti/Contatti";
import {dynamicMetadata} from "@/server/metadata";
import type {Metadata} from "next";

export const metadata: Metadata = dynamicMetadata({
	title: "Contatti",
	description: "Contatta Bacheca Dilettanti per informazioni, assistenza e collaborazioni.",
	canonicalPath: "/contatti",
});

export default function ContattiPage() {
	return <><Navbar /><Contatti /><Footer whiteBackground /></>;
}
