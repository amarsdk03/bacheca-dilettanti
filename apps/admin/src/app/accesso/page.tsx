import Image from "next/image";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccessState } from "@/features/auth/components/AccessState";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getAdminContext } from "@/features/auth/server/queries";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ uscita?: string }> }) {
  const context = await getAdminContext();
  if (context.status === "admin") redirect("/");
  const { uscita } = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-8" aria-labelledby="access-title">
        <Image src="/banner.png" alt="Bacheca Dilettanti" width={320} height={160} className="mx-auto h-auto max-w-full" priority />
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
