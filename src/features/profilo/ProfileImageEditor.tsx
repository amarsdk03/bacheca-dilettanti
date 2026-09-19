"use client";

import {type ChangeEvent, type ReactNode, useEffect, useRef, useState, useTransition} from "react";
import {useRouter} from "next/navigation";
import {CameraIcon, ImageUpIcon, LoaderCircleIcon, Trash2Icon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogDismissButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {toast} from "@/components/ui/toast";
import {PROFILE_IMAGE_MAX_SOURCE_BYTES, type ProfileImageScope,} from "@/features/profilo/profile-image";
import {removeProfileImage, saveProfileImage} from "@/features/profilo/server/actions";
import {cn} from "@/lib/utils";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ProfileImageEditorProps {
	scope: ProfileImageScope;
	imageUrl: string | null;
	hasCustomImage: boolean;
	fallback: ReactNode;
	title: string;
	description: string;
	alt: string;
	avatarClassName?: string;
	buttonLabel?: string;
}

export default function ProfileImageEditor({
	scope,
	imageUrl,
	hasCustomImage,
	fallback,
	title,
	description,
	alt,
	avatarClassName,
	buttonLabel = "Modifica foto",
}: ProfileImageEditorProps) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<"save" | "remove" | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);

	const resetSelection = () => {
		setFile(null);
		setErrorMessage(null);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const nextFile = event.target.files?.[0] ?? null;
		setErrorMessage(null);
		if (!nextFile) return;
		if (!ACCEPTED_IMAGE_TYPES.has(nextFile.type) || nextFile.size <= 0 || nextFile.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
			setErrorMessage("Seleziona un’immagine JPEG, PNG o WebP di massimo 5 MB.");
			event.target.value = "";
			return;
		}
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setFile(nextFile);
		setPreviewUrl(URL.createObjectURL(nextFile));
	};

	const handleSave = () => {
		if (!file) return;
		setErrorMessage(null);
		setPendingAction("save");
		startTransition(async () => {
			const formData = new FormData();
			formData.set("image", file);
			try {
				const result = await saveProfileImage(scope, formData);
				if (result.status === "error") {
					setErrorMessage(result.message);
					return;
				}
				toast.add({title: "Foto aggiornata", description: result.message, type: "success"});
				resetSelection();
				setOpen(false);
				router.refresh();
			} catch {
				setErrorMessage("La richiesta non è stata completata. Riprova.");
			} finally {
				setPendingAction(null);
			}
		});
	};

	const handleRemove = () => {
		setErrorMessage(null);
		setPendingAction("remove");
		startTransition(async () => {
			try {
				const result = await removeProfileImage(scope);
				if (result.status === "error") {
					setErrorMessage(result.message);
					return;
				}
				toast.add({title: "Foto rimossa", description: result.message, type: "success"});
				resetSelection();
				setOpen(false);
				router.refresh();
			} catch {
				setErrorMessage("La richiesta non è stata completata. Riprova.");
			} finally {
				setPendingAction(null);
			}
		});
	};

	const displayedImage = previewUrl ?? imageUrl;

	const dialogTriggerTranslation = scope === "main" ? "70%" : "55%";

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => {
			if (pending) return;
			setOpen(nextOpen);
			if (!nextOpen) resetSelection();
		}}>
			<div className="group/profile-image relative w-fit shrink-0">
				<Avatar className={cn("size-16 text-lg", avatarClassName)}>
					{imageUrl && <AvatarImage src={imageUrl} alt={alt} />}
					<AvatarFallback>{fallback}</AvatarFallback>
				</Avatar>
				<DialogTrigger
					render={<Button type="button" variant="secondary" size="icon-xs" />}
					className="absolute rounded-full shadow-sm"
					style={{"top": dialogTriggerTranslation, "left": dialogTriggerTranslation}}
					aria-label={buttonLabel}
				>
					<CameraIcon aria-hidden="true" />
				</DialogTrigger>
			</div>

			<DialogContent>
				<DialogDismissButton disabled={pending} />
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="grid justify-items-center gap-4">
					<Avatar className="size-48 min-size-48 max-size-48 text-3xl ring-2 ring-muted">
						{displayedImage && <AvatarImage src={displayedImage} alt={alt} />}
						<AvatarFallback>{fallback}</AvatarFallback>
					</Avatar>
					<p className="text-center text-sm text-muted-foreground">
						L’immagine sarà ritagliata al centro e ottimizzata in formato quadrato.
					</p>
					<input
						ref={inputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="sr-only"
						onChange={handleFileChange}
						disabled={pending}
					/>
					<Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
						<ImageUpIcon aria-hidden="true" />
						{file ? "Scegli un’altra foto" : "Scegli una foto"}
					</Button>
				</div>

				{errorMessage && (
					<Alert variant="destructive" aria-live="polite">
						<AlertTitle>Operazione non riuscita</AlertTitle>
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				<DialogFooter className="flex-wrap justify-between">
					<div>
						{hasCustomImage && (
							<Button type="button" variant="destructive" onClick={handleRemove} disabled={pending}>
								{pendingAction === "remove" ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : <Trash2Icon aria-hidden="true" />}
								Rimuovi
							</Button>
						)}
					</div>
					<div className="flex gap-2">
						<DialogClose disabled={pending}>Annulla</DialogClose>
						<Button type="button" onClick={handleSave} disabled={!file || pending}>
							{pendingAction === "save" && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
							Salva foto
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
