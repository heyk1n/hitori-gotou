import {
	type APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	APIVersion,
	InteractionResponseType,
	MessageFlags,
	Routes,
} from "discord";
import { Status } from "std/http/http_status.ts";
import { decodeHex } from "std/encoding/hex.ts";
import tweetnacl from "npm:tweetnacl@1.0.3";
import { REST } from "@discordjs/rest";

import CommandUtils from "./utils/command.ts";
import InteractionUtils from "./utils/interaction.ts";

import manifest from "./manifest.gen.ts";
import OpenAI from "openai";

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

	const rest = new REST({ version: APIVersion }).setToken(
		Deno.env.get("DISCORD_TOKEN")!,
	);
	const interaction: APIInteraction = JSON.parse(body);

	if (InteractionUtils.isApplicationCommand(interaction)) {
		const command = manifest.commands.find((command) =>
			command.data.name === interaction.data.name
		);
		if (command) {
			if (CommandUtils.isChatInput(command)) {
				return await command.execute({
					interaction:
						interaction as APIChatInputApplicationCommandInteraction,
					openai: new OpenAI(),
					rest,
				});
			} else {
				return new Response(
					`Unknown command type. (${interaction.data.type})`,
				);
			}
		} else {
			return Response.json({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Ehh~ c- command nya ga ada mas.,`,
					flags: MessageFlags.Ephemeral,
				},
			});
		}
	} else if (InteractionUtils.isPing(interaction)) {
		await rest.put(
			Routes.applicationCommands(Deno.env.get("DISCORD_ID")!),
			{
				body: manifest.commands.map((command) => command.data),
			},
		);
		return Response.json({
			type: InteractionResponseType.Pong,
		});
	} else {
		return new Response(`Unknown interaction type. (${interaction.type})`);
	}
}

Deno.serve(handler);
