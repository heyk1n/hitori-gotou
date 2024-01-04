import type { ChatInputCommand } from "../types.d.ts";
import {
	type APIApplicationCommandInteractionDataStringOption,
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponseDeferredChannelMessageWithSource,
	ApplicationCommandOptionType,
	InteractionResponseType,
	Routes,
} from "discord";
import type { OpenAI } from "openai";
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
	execute({ interaction, openai, rest }): Response {
		handleInteraction(interaction, openai, rest);
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
): Promise<void> {
	const data = interaction.data.options?.find(
		(option) => option.name == "message",
	)! as APIApplicationCommandInteractionDataStringOption;
	const author = interaction.member!.user;
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content:
					`Kamu adalah karakter anime bernama "Hitori Gotou" yang berasal dari Isekai\nCatatan: Kamu sedang berbicara dengan pengguna bernama "${author.username}" buat respon pengguna sesingkat mungkin`,
			},
			{
				role: "user",
				content: data.value,
			},
		],
		model: "gpt-3.5-turbo",
		user: `${author.username}#${author.discriminator ?? "0"}`,
	});

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
				}\n** **\n${completion.choices[0].message.content}`,
			},
		},
	);
}
