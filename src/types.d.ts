import type {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord";
import type { OpenAI } from "openai/mod.ts";
import type { REST } from "@discordjs/rest";

export interface ExecuteOptions<
	T extends APIInteraction,
> {
	interaction: T;
	openai: OpenAI;
	rest: REST;
	kv: Deno.Kv;
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
