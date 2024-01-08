import type { ChatInputCommand } from "../types.d.ts";
import {
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataStringOption,
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponseDeferredChannelMessageWithSource,
	ApplicationCommandOptionType,
	InteractionResponseType,
	Routes,
} from "discord";
import type { OpenAI } from "openai/mod.ts";
import type {
	MessageContentImageFile,
	MessageContentText,
} from "openai/resources/beta/threads/messages/mod.ts";
import type { REST } from "@discordjs/rest";

export default {
	data: {
		name: "chat",
		description: "Ngobrol sama waifu >///<",
		options: [
			{
				name: "message",
				description: "Ngomong ke waifu >///<",
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
		dm_permission: false,
	},
	execute({ interaction, openai, rest, kv }): Response {
		handleInteraction(interaction, openai, rest, kv);
		const interactionResponse:
			APIInteractionResponseDeferredChannelMessageWithSource = {
				type: InteractionResponseType.DeferredChannelMessageWithSource,
				data: {},
			};

		return Response.json(interactionResponse);
	},
} as ChatInputCommand;

async function handleInteraction(
	interaction: APIChatInputApplicationCommandInteraction,
	openai: OpenAI,
	rest: REST,
	kv: Deno.Kv,
): Promise<void> {
	const data = interaction.data.options?.find(
		(option: APIApplicationCommandInteractionDataOption) =>
			option.name == "message" &&
			option.type == ApplicationCommandOptionType.String,
	)! as APIApplicationCommandInteractionDataStringOption;
	const author = interaction.member!.user.username;

	let threadId: string;
	const { value: thread } = await kv.get<string>([
		"threads",
		interaction.channel.id,
	]);
	if (thread) {
		threadId = thread;
	} else {
		const newThread = await openai.beta.threads.create();
		threadId = newThread.id;
		await kv.set(["threads", interaction.channel.id], threadId);
	}

	await openai.beta.threads.messages.create(threadId, {
		role: "user",
		content: `${author}: ${data.value}`,
	});

	const run = await openai.beta.threads.runs.create(threadId, {
		assistant_id: Deno.env.get("OPENAI_ASSISTANT_ID")!,
		additional_instructions:
			`Nama lawan bicara pada dialog, tapi, jangan gunakan format yang sama untuk membalas pesan pengguna, cukup masukkan jawaban mu saja`,
	});

	const intervalId = setInterval(() => {
		handleRun(interaction, openai);
	}, 2_000);

	async function handleRun(
		interaction: APIChatInputApplicationCommandInteraction,
		openai: OpenAI,
	): Promise<void> {
		const currentRun = await openai.beta.threads.runs.retrieve(
			threadId,
			run.id,
		);

		let content: string;

		if (["queued", "in_progress"].includes(currentRun.status)) {
			return;
		} else {
			clearInterval(intervalId);
			if (currentRun.status == "completed") {
				const results = await openai.beta.threads.messages.list(
					threadId,
					{ limit: 1 },
				);

				const initResponse = results.data.at(0)!;
				content = (initResponse.content.find((
					ctx: MessageContentImageFile | MessageContentText,
				) => ctx.type == "text") as MessageContentText)?.text
					.value ??
					"Aku lagi sibuk kak, maaf ya >.<";
			} else {
				content = `Failed to conplete runs. (${currentRun.status})`;
			}
		}

		await rest.patch(
			Routes.webhookMessage(
				interaction.application_id,
				interaction.token,
			),
			{
				body: {
					content,
				},
			},
		);
	}
}
