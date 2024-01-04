import {
	type APIInteraction,
	type APIPingInteraction,
	InteractionType,
} from "discord";

export default {
	isPingInteraction(
		interaction: APIInteraction,
	): interaction is APIPingInteraction {
		return interaction.type == InteractionType.Ping;
	},
};
