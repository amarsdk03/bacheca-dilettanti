import AccediForm from "@/features/accedi/AccediForm";
import AuthSplitLayout from "@/features/auth/AuthSplitLayout";

interface AccediProps {
	nextPath: string;
	invalidConfirmationLink?: boolean;
}

export default function Accedi({nextPath, invalidConfirmationLink = false}: AccediProps) {
	return (
		<AuthSplitLayout>
			<AccediForm
				nextPath={nextPath}
				invalidConfirmationLink={invalidConfirmationLink}
			/>
		</AuthSplitLayout>
	);
}
