import type {AuthError} from "@supabase/supabase-js";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
	bad_code_verifier: "Il collegamento di accesso non è più valido. Riprova.",
	email_address_invalid: "Inserisci un indirizzo email valido.",
	email_address_not_authorized: "Questo indirizzo email non è autorizzato.",
	email_exists: "Esiste già un account associato a questa email.",
	email_not_confirmed: "Conferma prima il tuo indirizzo email.",
	email_provider_disabled: "L'accesso tramite email non è disponibile.",
	flow_state_expired: "La richiesta è scaduta. Riprova.",
	flow_state_not_found: "La richiesta non è più valida. Riprova.",
	invalid_credentials: "Email o password non corrette.",
	invalid_request: "La richiesta non è valida. Riprova.",
	otp_expired: "Il codice è scaduto o non è valido. Richiedine uno nuovo.",
	over_email_send_rate_limit: "Hai richiesto troppi messaggi. Attendi qualche minuto e riprova.",
	over_request_rate_limit: "Hai effettuato troppi tentativi. Attendi qualche minuto e riprova.",
	same_password: "Scegli una password diversa da quella attuale.",
	session_not_found: "La sessione è scaduta. Richiedi un nuovo link.",
	signup_disabled: "La registrazione non è disponibile in questo momento.",
	user_banned: "Questo account non può accedere alla piattaforma.",
	user_already_exists: "Esiste già un account associato a questa email.",
	user_not_found: "Email o password non corrette.",
	weak_password: "Scegli una password più sicura.",
};

export function getAuthErrorMessage(error: AuthError | null) {
	if (!error) {
		return "Si è verificato un errore inatteso. Riprova.";
	}

	return AUTH_ERROR_MESSAGES[error.code ?? ""] ?? "Non è stato possibile completare l'operazione. Riprova.";
}
