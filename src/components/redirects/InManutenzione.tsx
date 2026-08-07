export default function InManutenzione() {
	return (
		<div className={"w-full min-h-screen px-6 flex flex-col items-center justify-center text-center"}>
			<img
				src="/logo.png"
				alt="Bacheca Dilettanti"
				className={"size-48 w-auto"}
			/>

			<div className={"mb-24"}>
				<h1 className={"text-4xl font-bold mb-4"}>
					Sito web in manutenzione
				</h1>
				<h3 className={"text-xl text-zinc-400 font-bold"}>
					Torneremo operativi il prima possibile!
				</h3>
			</div>
		</div>
	);
}