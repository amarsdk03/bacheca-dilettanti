import "server-only";

import sharp from "sharp";

import {PROFILE_IMAGE_MAX_SOURCE_BYTES, PROFILE_IMAGE_OUTPUT_SIZE,} from "@/features/profilo/profile-image";

const PROFILE_IMAGE_OUTPUT_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function optimizeProfileImage(file: File) {
	if (!PROFILE_IMAGE_ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
		throw new Error("INVALID_PROFILE_IMAGE");
	}

	try {
		const source = Buffer.from(await file.arrayBuffer());
		const image = sharp(source, {limitInputPixels: 40_000_000, failOn: "warning"});
		const metadata = await image.metadata();
		if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
			throw new Error("INVALID_PROFILE_IMAGE");
		}
		const output = await image
			.rotate()
			.resize(PROFILE_IMAGE_OUTPUT_SIZE, PROFILE_IMAGE_OUTPUT_SIZE, {fit: "cover", position: "centre"})
			.webp({quality: 84, effort: 4})
			.toBuffer();
		if (output.byteLength > PROFILE_IMAGE_OUTPUT_MAX_BYTES) throw new Error("PROFILE_IMAGE_TOO_LARGE");
		return output;
	} catch (error) {
		if (error instanceof Error && error.message === "PROFILE_IMAGE_TOO_LARGE") throw error;
		throw new Error("INVALID_PROFILE_IMAGE");
	}
}
