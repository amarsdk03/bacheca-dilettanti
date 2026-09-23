import Link from "next/link";
import {EyeIcon} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";

export default function AnnouncementViewLink({id, isListed}: {id: string; isListed: boolean}) {
	return (
		<Link href={`/dettagli-annuncio?${new URLSearchParams({id})}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({variant: "outline"})}>
			<EyeIcon data-icon="inline-start" aria-hidden="true" />
			{isListed ? "Visualizza" : "Anteprima"}
			<span className="sr-only"> annuncio (si apre in una nuova scheda)</span>
		</Link>
	);
}
