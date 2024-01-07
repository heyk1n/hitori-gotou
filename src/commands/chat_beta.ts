import type { ChatInputCommand } from "../types.d.ts";
import {
	type APIApplicationCommandInteractionDataStringOption,
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponseDeferredChannelMessageWithSource,
	ApplicationCommandOptionType,
	InteractionResponseType,
	Routes,
} from "discord";
import type { OpenAI } from "openai/mod.ts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.ts";
import type { REST } from "@discordjs/rest";

export default {
	data: {
		name: "chat_beta",
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
		(option) => option.name == "message",
	)! as APIApplicationCommandInteractionDataStringOption;
	const author = interaction.member!.user;

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
		content: data.value,
		metadata: {
			username: author.username,
		},
	});

	const run = await openai.beta.threads.runs.create(threadId, {
		assistant_id: Deno.env.get("OPENAI_ASSISTANT_ID")!,
	});

	let status: string = run.status;
	let intervalId: number;

	intervalId = setInterval(() => {
		handleRun(interaction, openai);
	}, 3_000);

	async function handleRun(
		interaction: APIChatInputApplicationCommandInteraction,
		openai: OpenAI,
	): Promise<void> {
		if (status == "completed") {
			//TODO: handle completion
		}
	}
}
