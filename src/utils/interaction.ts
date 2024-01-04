import {
	type APIApplicationCommandInteraction,
	type APIInteraction,
	type APIPingInteraction,
	InteractionType,
} from "discord";

export default {
	isApplicationCommand(
		interaction: APIInteraction,
	): interaction is APIApplicationCommandInteraction {
		return interaction.type == InteractionType.ApplicationCommand;
	},
	isPing(
		interaction: APIInteraction,
	): interaction is APIPingInteraction {
		return interaction.type == InteractionType.Ping;
	},
};
