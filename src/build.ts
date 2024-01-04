const commands: string[] = [];

for await (const dir of Deno.readDir("./src/commands")) {
	commands.push(`./commands/${dir.name}`);
}

const output = `
import type { Manifest } from "./types.d.ts";

${
	commands.map(
		(ctx: string, index: number) => `import $${index} from "${ctx}"`,
	)
		.join("\n")
}

export default {
	commands: [
		${
	commands.map(
		(_ctx: string, index: number) => `$${index}`,
	)
		.join(",\n")
}
	]
} as Manifest`;

const proc = new Deno.Command(
	Deno.execPath(),
	{
		args: [
			"fmt",
			"-",
		],
		stdin: "piped",
		stdout: "piped",
		stderr: "piped",
	},
)
	.spawn();

const raw = new ReadableStream({
	type: "bytes",
	start(cont: ReadableByteStreamController): void {
		cont.enqueue(new TextEncoder().encode(output));
		cont.close();
	},
});
await raw.pipeTo(proc.stdin);

const { stdout } = await proc.output();
const manifestString = new TextDecoder().decode(stdout);

await Deno.writeTextFile("src/manifest.gen.ts", manifestString);
