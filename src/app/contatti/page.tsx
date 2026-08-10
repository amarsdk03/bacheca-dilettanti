import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Contatti from "@/features/contatti/Contatti";
import {dynamicMetadata} from "@/server/metadata";

export const metadata = dynamicMetadata("Contatti", "Contatta lo staff di Bacheca Dilettanti.", "/contatti");

export default function ContattiPage() {
	const emailStaff = process.env.CONTACT_EMAIL ?? "contatti@bachecadilettanti.it";

	return <><Navbar /><Contatti emailStaff={emailStaff} /><Footer whiteBackground /></>;
}
