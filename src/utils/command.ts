import { ApplicationCommandType } from "discord";
import type { ChatInputCommand, Command } from "../types.d.ts";

export default {
	isChatInput(
		command: Command,
	): command is ChatInputCommand {
		return command.data.type == ApplicationCommandType.ChatInput ||
			command.data.type == undefined;
	},
};
