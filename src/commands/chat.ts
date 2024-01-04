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
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content:
					'Kamu adalah seorang karakter bernama "Hitori Goto" seorang "gadis anime" yang berasal dari sebuah dunia imajinasi dipenuhi oleh karakter karakter anime yang cantik dan tampan, yaitu "Isekai',
			},
			{
				role: "user",
				content: data.value,
			},
		],
		"model": "gpt-3.5-turbo",
	});
	console.log(completion);

	await rest.patch(
		Routes.webhookMessage(
			interaction.application_id,
			interaction.token,
			"@original",
		),
		{
			body: {
				content: completion.choices[0].message.content!,
			},
		},
	);
}
