//* Only updates the commands' stringified array hash changes (=option changes) as refreshing on startup is considered to be a bad practice *//
//* Make sure to run this script like so in the root directory: node src/deploy.mjs *//
// Dependencies

import { config } from "dotenv";
config();

import { REST as DisAPI } from "@discordjs/rest";
import { Routes } from "discord.js";

import crypto from "crypto";
import fs from "fs";

// Setting up slash commands

const rest = new DisAPI({ version: "10" }).setToken(process.env.TOKEN);

const CACHE_FILE_NAME = "latesthash";

try {
	const startingTimestamp = Date.now();
	const lang = JSON.parse(fs.readFileSync("./lang.json"));
	const commands = [
		lang.commands[0],
		{
			...lang.commands[1],
			options: [
				{
					name: "member",
					description: "the person you want to look up",
					type: 6,
					required: false,
				},
			],
		},
		lang.commands[2],
	];

	let latestHash = "";
	const p =
		(process.env.DOCKER_RUNNING ? "/usr/local/apps/n-word-monitor/" : "") +
		CACHE_FILE_NAME +
		".cache";

	if (fs.existsSync(p)) {
		latestHash = fs.readFileSync(p, "utf-8");
	}

	const hash = crypto
		.createHash("sha1")
		.update(JSON.stringify(commands))
		.digest("base64");

	if (latestHash !== hash) {
		fs.writeFileSync(p, hash);

		await rest.put(
			Routes.applicationGuildCommands(
				process.env.CLIENT_ID,
				process.env.GUILD_ID
			),
			{
				body: commands,
			}
		);

		console.log(
			`Successfuly refreshed application (/) commands, process took ${
				Date.now() - startingTimestamp
			}ms`
		);
	}
} catch (error) {
	console.error(
		`An error occurred whilst refreshing up application (/) commands : ${error}\nMake sure to run this script like so in the root directory: node src/deploy.mjs`
	);
}
