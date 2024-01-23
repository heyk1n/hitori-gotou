import type { ChatInputCommand } from "../types.d.ts";
import {
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataStringOption,
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponseDeferredChannelMessageWithSource,
	ApplicationCommandOptionType,
	InteractionResponseType,
	type RESTPostAPIChannelMessageJSONBody,
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
	const author = interaction.member!.user;

	let threadId: string;
	const kvKey = ["threads", interaction.channel.id];
	const { value: thread } = await kv.get<string>(kvKey);
	if (thread) {
		threadId = thread;
	} else {
		const newThread = await openai.beta.threads.create();
		threadId = newThread.id;
		await kv.set(kvKey, threadId);
	}

	await openai.beta.threads.messages.create(threadId, {
		role: "user",
		content: `@${author.username}: ${data.value}`,
	});

	const run = await openai.beta.threads.runs.create(threadId, {
		assistant_id: Deno.env.get("OPENAI_ASSISTANT_ID")!,
		additional_instructions:
			`Pesan dari pengguna berformat "@{nama_pengguna}: {isi_pesan}", gunakan format "{isi_pesan}" untuk membalas pesan pengguna`,
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

		const payload: RESTPostAPIChannelMessageJSONBody = {};
		const apiRoute = Routes.webhookMessage(
			interaction.application_id,
			interaction.token,
		);

		if (["queued", "in_progress"].includes(currentRun.status)) {
			return;
		} else {
			clearInterval(intervalId);
			if (currentRun.status == "completed") {
				const result = await openai.beta.threads.messages.list(
					threadId,
					{ limit: 1 },
				).then((ctx) => ctx.data.at(0));

				const botMessage = (result?.content.find((
					ctx: MessageContentImageFile | MessageContentText,
				) => ctx.type == "text") as MessageContentText)?.text.value;

				if (botMessage) {
					payload.embeds = [
						{
							color: 0xffffff,
							author: {
								name: author.username +
									(author.discriminator == "0"
										? ""
										: `#${author.discriminator}`),
								icon_url: author.avatar
									? rest.cdn.avatar(author.id, author.avatar)
									: rest.cdn.defaultAvatar(
										Number((BigInt(author.id) >> 22n) % 6n),
									),
							},
							description: `### ${
								data.value.replaceAll("\n", " ")
							}\n** **\n${botMessage}`,
						},
					];
				} else {
					await rest.delete(apiRoute);
				}
			} else {
				payload.content =
					`Failed to conplete runs. (${currentRun.status})`;
			}
		}

		await rest.patch(
			apiRoute,
			{
				body: payload,
			},
		);
	}
}
