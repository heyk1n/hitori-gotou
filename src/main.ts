import { type APIInteraction, InteractionResponseType } from "discord";
import { Status } from "std/http/http_status.ts";
import { decodeHex } from "std/encoding/hex.ts";
import tweetnacl from "npm:tweetnacl@1.0.3";

import InteractionUtils from "./utils/interaction.ts";

async function handler(request: Request) {
	const invalidRequest = new Response(
		"Invalid request.",
		{ status: Status.Unauthorized },
	);
	const headers = ["x-signature-ed25519", "x-signature-timestamp"];
	if (
		request.method != "POST" &&
		!headers.every((header) => request.headers.has(header))
	) return invalidRequest;

	const [signature, timestamp] = headers.map((header) =>
		request.headers.get(header)
	);
	const body = await request.text();

	const valid = tweetnacl.sign.detached.verify(
		new TextEncoder().encode(timestamp + body),
		decodeHex(signature!),
		decodeHex(Deno.env.get("DISCORD_PUBLIC_KEY")!),
	);

	if (!valid) return invalidRequest;

	const interaction: APIInteraction = JSON.parse(body);

	if (InteractionUtils.isPingInteraction(interaction)) {
		return Response.json({
			type: InteractionResponseType.Pong,
		});
	} else {
		return new Response(`Unknown interaction type. (${interaction.type})`);
	}
}

Deno.serve(handler);
