import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Contatti from "@/features/contatti/Contatti";
import {dynamicMetadata} from "@/server/metadata";
import type {Metadata} from "next";

export const metadata: Metadata = dynamicMetadata("Contatti");

export default function ContattiPage() {
	return <><Navbar /><Contatti /><Footer whiteBackground /></>;
}
