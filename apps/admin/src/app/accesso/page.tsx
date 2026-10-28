import Image from "next/image";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccessState } from "@/features/auth/components/AccessState";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getAdminContext } from "@/features/auth/server/queries";
import TechText from "@/components/TechText";
import GradientASCII from "@/components/GradientASCII";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ uscita?: string }> }) {
	const context = await getAdminContext();
	if (context.status === "admin") redirect("/");
	const { uscita } = await searchParams;
	return (
		<main className="relative isolate flex min-h-svh items-center justify-center px-6 py-8">
			<div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
				<GradientASCII
					colors={["#981ed8","#faf6ff","#cea5ff","#8638f8"]}
					shape="horizon"
					characters=" 01"
					cellSize={16}
					density={0.5}
					glyphOpacity={0.75}
					glow={0.8}
					depthOfField={0}
					flicker={0.2}
					softness={0}
					scale={1.2}
					flow={0.5}
					speed={0.2}
					gradientOpacity={1}
					grain={0.1}
					variation={0}
					mouseInteraction={true}
					scrambleRadius={0.5}
					clickEffect={"wave"}
					intro
				/>
				</div>
			<section className="relative z-10 flex w-full max-w-sm flex-col" aria-labelledby="access-title">
				<Image src="/banner.png" alt="Bacheca Dilettanti" width={320} height={160} className="mx-auto h-auto max-w-full" priority />
				<div style={{ width: '100%', height: '100px', position: 'relative' }} className={"mb-6 -translate-y-6"}>
					<TechText
						text="Dashboard"
						fontWeight={600}
						fontSize={150}
						reveal="letter"
						dashLength={4}
						dashGap={2}
						specks={10}
						intro="type"
						introDuration={1.5}
						clickKick={true}
						guides={false}
						fontFamily=""
						letterSpacing={-0.05}
						accentColor="currentColor"
						reach={100}
						softness={0.7}
						lineStyle="dashed"
						strokeWidth={1.5}
						speed={1}
						bounce={0.05}
						selection
						labels
						color="currentColor"
						align="center"
						draggable={false}
						sweep
					/>
				</div>
				<h1 id="access-title" className="sr-only">Accesso amministrativo</h1>
				{context.status === "unavailable" || (context.status === "denied" && context.authId) ?
					<AccessState unavailable={context.status === "unavailable"} /> : <>
						{(uscita === "parziale" || uscita === "audit") && <Alert><AlertDescription>
							{uscita === "parziale" ? "Sessione locale rimossa. Non è stato possibile confermare la revoca remota." :
								"Sessione rimossa. Non è stato possibile confermare la registrazione dell’uscita."}
                        </AlertDescription></Alert>}
						<LoginForm />
					</>}
			</section>
		</main>
	);
}
