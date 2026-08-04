import {SiFacebook, SiWhatsapp, SiX} from "@icons-pack/react-simple-icons";

interface ShareButtonsProps {
	title: string;
	url: string;
}

const iconClassName = "size-4";

export default function ShareButtons({title, url}: ShareButtonsProps) {
	const encodedUrl = encodeURIComponent(url);
	const encodedTitle = encodeURIComponent(title);
	const links = [
		{label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, icon: SiWhatsapp},
		{label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: SiFacebook},
		{label: "X", href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`, icon: SiX},
	];

	return (
		<div className="flex flex-wrap items-center gap-2" aria-label="Condividi l'articolo">
			<span className="mr-1 text-sm font-semibold text-neutral-700">Condividi</span>
			{links.map(({label, href, icon: Icon}) => (
				<a
					key={label}
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`Condividi su ${label}`}
					className="inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:-translate-y-0.5 hover:border-fuchsia-300 hover:text-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
				>
					<Icon className={iconClassName} title={label} />
				</a>
			))}
		</div>
	);
}
