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
		(option) => option.name == "message",
	)! as APIApplicationCommandInteractionDataStringOption;
	const author = interaction.member!.user;

	const cache = await kv.get<ChatCompletionMessageParam[]>([
		"threads",
		interaction.channel.id,
	]);
	const messages = cache.value ?? [];
	const newMessage: ChatCompletionMessageParam = {
		role: "user",
		content: data.value,
	};

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content:
					`Kamu adalah karakter anime bernama "Hitori Gotou" yang berasal dari Isekai\nCatatan: Kamu sedang berbicara dengan pengguna bernama "${author.username}" buat respon pengguna sesingkat mungkin`,
			},
			...messages,
			newMessage,
		],
		model: "gpt-3.5-turbo",
		user: `${author.username}#${author.discriminator ?? "0"}`,
	});

	const result = completion.choices[0].message;
	await kv.set(["threads", interaction.channel.id], [
		...messages,
		newMessage,
		result,
	]);

	await rest.patch(
		Routes.webhookMessage(
			interaction.application_id,
			interaction.token,
			"@original",
		),
		{
			body: {
				content: `${
					data.value.split("\n").filter((ctx) => ctx.length).map(
						(ctx) => {
							if (ctx.startsWith("#")) {
								return ctx.replace("#", "### ");
							} else if (ctx.startsWith("##")) {
								return ctx.replace("##", "### ");
							} else if (ctx.startsWith("###")) {
								return ctx;
							} else {
								return `### ${ctx}`;
							}
						},
					)
				}\n** **\n${result.content}`,
			},
		},
	);
}
