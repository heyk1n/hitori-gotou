import type {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord";
import type { OpenAI } from "openai";
import type { REST } from "@discordjs/rest";

export interface ExecuteOptions<
	T extends APIInteraction,
> {
	interaction: T;
	openai: OpenAI;
	rest: REST;
}

export interface ChatInputCommand {
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute(
		options: ExecuteOptions<APIChatInputApplicationCommandInteraction>,
	): Promise<Response> | Response;
}

export type Command = ChatInputCommand;

export interface Manifest {
	commands: Command[];
}
