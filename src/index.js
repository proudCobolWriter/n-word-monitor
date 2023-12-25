require("dotenv").config();
const IS_DOCKER_CONTAINER = process.env.DOCKER_RUNNING === "true";

// Dependencies

const fs = require("fs");
const winston = require("winston");
const {
	Client,
	EmbedBuilder,
	ActivityType,
	IntentsBitField,
} = require("discord.js");

const botIntents = new IntentsBitField();
botIntents.add(
	IntentsBitField.Flags.Guilds,
	IntentsBitField.Flags.GuildMembers,
	IntentsBitField.Flags.GuildMessages,
	IntentsBitField.Flags.MessageContent,
	IntentsBitField.Flags.GuildMessageReactions,
);

const client = new Client({
	intents: botIntents,
});

const commands = require("./commands/");

// Logging setup (times are logged in UTC)

if (process.env.NODE_ENV === "production") {
	require("winston-daily-rotate-file");

	const ansiRegex = ({ onlyFirst = false } = {}) => {
		const pattern = [
			"[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
			"(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
		].join("|");

		return new RegExp(pattern, onlyFirst ? undefined : "g");
	};

	const logger = winston.createLogger({
		defaultMeta: { service: "user-service" },
		exitOnError: false,
		colorize: true,
		transports: [
			new winston.transports.DailyRotateFile({
				filename: IS_DOCKER_CONTAINER
					? "/usr/local/apps/n-word-monitor/logs/combined-%DATE%.log"
					: "./logs/combined-%DATE%.log",
				datePattern: "MM-DD-YYYY-HH",
				maxSize: "1g",
				format: winston.format.combine(
					winston.format.timestamp({
						format: "MMM-DD-YYYY HH:mm:ss",
					}),
					winston.format.printf(
						({ level, message, timestamp, stack }) =>
							`${level.replace(
								ansiRegex(),
								"",
							)}: BOT-LOGS: ${timestamp}: ${
								stack ? stack : message
							}`,
					),
				),
			}),
			new winston.transports.Console(),
		],
		format: winston.format.combine(
			winston.format.timestamp({
				format: "MMM-DD-YYYY HH:mm:ss",
			}),
			winston.format.colorize(),
			winston.format.printf(
				({ level, message, timestamp, stack }) =>
					`${level}: BOT-LOGS: ${timestamp}: ${
						stack ? stack : message
					}`,
			),
		),
	});

	console.log = (d) => {
		logger.info(d);
	};

	console.error = (d) => {
		logger.error(new Error(d));
	};
}

// Constants

const intervalDelay = 15e3;
const coooldownMessages = 30e3;

// Data storage

let uptimeData = {};
let data = [];
let lang = {};

const msgCooldownData = new Map();

// Command states

let changed = false;
let nwordusages = 0;

// Create user object

function User(userID, score, scoreAfterMidnight, userPfpURL, userUsername) {
	this.user = {
		userID: userID || -1, // discord user snowflake id
		userMeta: {
			iconURL: userPfpURL || "./favicon.ico",
			username: userUsername || "Unknown Member",
		},
		score: score || 0, // occurrences
		scoreAfterMidnight: scoreAfterMidnight || 0, // occurrences this day
		day: new Date().getUTCDate(), // date "scoreAfterMidnight" corresponds to
		month: new Date().getUTCMonth(), // date "scoreAfterMidnight" corresponds to
	};
}

// Prototype extensions

String.prototype.format = function () {
	let a = this;
	for (const k in arguments) {
		a = a.replace("{" + k + "}", arguments[k]);
	}
	return a;
};

// Functions and event handlers

function readJSON(p, readInDockerStorage = false) {
	let result = [];

	if (readInDockerStorage) {
		// use "db-data" volume instead if ran inside a Docker container
		p = "/usr/local/apps/n-word-monitor/" + p;
	}

	try {
		result = fs.readFileSync(p, "utf-8");
		result = JSON.parse(result);
	} catch {
		console.log("Caught an error while parsing at path : " + p);
	}

	return [p, result];
}

function writeToJSON(p, writeInDockerStorage = false, dataToWrite) {
	if (writeInDockerStorage) {
		// use "db-data" volume instead if ran inside a Docker container
		p = "/usr/local/apps/n-word-monitor/" + p;
	}

	try {
		fs.writeFileSync(p, JSON.stringify(dataToWrite, null, 4));
		console.log(`${p} was successfully written`);
	} catch {
		console.log(`Caught an error while writing at path : ${p}`);
	}

	return p;
}

let presenceIndex = 0;
function setDiscordPresence() {
	const modulo = presenceIndex % 3;
	const presenceSettings = [
		{
			activities: [
				{
					name: lang.presence[0].format(nwordusages),
					type: ActivityType.Watching,
				},
			],
			status: "idle",
		},
		{
			activities: [
				{
					name: lang.presence[1],
					type: ActivityType.Competing,
				},
			],
			status: "online",
		},
		{
			activities: [
				{
					name: lang.presence[2],
					type: ActivityType.Watching,
				},
			],
			status: "dnd",
		},
	];

	client.user.setPresence(presenceSettings[modulo]);
	console.log(
		`Successfully set bot's presence (${presenceSettings[modulo].activities[0].name})`,
	);

	presenceIndex++;
}

function checkMessage(lowercaseMessage) {
	const explicitWords = process.env.EXPLICIT_WORDS.split(",");
	const isExplicit = explicitWords.some((word) =>
		lowercaseMessage.includes(word),
	);

	return isExplicit;
}

function scoreAfterMidnightUpdate(userData, removing) {
	if (
		userData.user.scoreAfterMidnight != undefined &&
		userData.user.day != undefined &&
		userData.user.month != undefined
	) {
		if (
			userData.user.day != new Date().getUTCDate() ||
			userData.user.month != new Date().getUTCMonth()
		) {
			console.log("Resetted count : a new day has passed");
			userData.user.scoreAfterMidnight = removing ? 0 : 1;
			userData.user.day = new Date().getUTCDate();
			userData.user.month = new Date().getUTCMonth();
		} else {
			userData.user.scoreAfterMidnight += removing ? -1 : 1;
		}
	}
}

function milestoneFunction() {
	if (nwordusages % 1000 == 0 && nwordusages != 0) {
		try {
			let guild = client.guilds.cache.get(
				process.env.GUILD_ID.toString(),
			);

			let createEmbed = () => {
				return new EmbedBuilder()
					.setTitle(lang["l_1"].title.format(nwordusages))
					.setThumbnail(guild.iconURL ? guild.iconURL() : "")
					.setTimestamp()
					.setColor("Aqua")
					.setDescription(lang["l_1"].description);
			};

			let firstChannel = guild.channels.cache.find((ch) =>
				ch.name.includes("general"),
			);

			if (firstChannel) {
				firstChannel.send({ embeds: [createEmbed()] });
			} else {
				console.log("Couldn't find a general channel!");
			}
		} catch (err) {
			console.log(err);
		}
	}
}

(() => {
	let rawUptime = readJSON("uptimeData.json", IS_DOCKER_CONTAINER);
	let rawData = readJSON("db.json", IS_DOCKER_CONTAINER);
	let rawLang = readJSON("./lang.json");

	uptimeData = rawUptime[1];
	data = rawData[1];
	lang = rawLang[1];

	if (!data || Object.keys(data).length == 0) {
		if (fs.existsSync(rawData[0])) {
			throw "Error retrieving database, the file is most likely skewed";
		} else {
			writeToJSON("db.json", true, data);
		}
	}

	if (!lang || Object.keys(lang).length == 0) {
		throw "Couldn't retrieve lang data";
	}

	if (!uptimeData || Object.keys(uptimeData).length == 0) {
		uptimeData = {
			startOfRecording: Math.floor(new Date().getTime() / 1000),
			lastRecording: 0,
			recordings: 0,
		};
		writeToJSON("uptimeData.json", IS_DOCKER_CONTAINER, uptimeData);
	}

	let updateNwordUsages = function () {
		nwordusages = 0;
		data.forEach((element) => {
			if (element && element.user && element.user.score > 0) {
				nwordusages = nwordusages + (element.user.score || 0);
			}
		});
	};
	updateNwordUsages();

	setInterval(() => {
		try {
			let lastTimestamp = uptimeData.lastRecording;
			let currentTimestamp = Math.floor(new Date().getTime() / 1000);

			if (currentTimestamp - lastTimestamp >= 3600) {
				uptimeData.lastRecording = currentTimestamp;
				uptimeData.recordings += 1;
				writeToJSON("uptimeData.json", IS_DOCKER_CONTAINER, uptimeData);
			}

			if (changed) {
				writeToJSON("db.json", IS_DOCKER_CONTAINER, data);
				changed = false;

				updateNwordUsages();
				setDiscordPresence();
				milestoneFunction();
			}
		} catch (err) {
			console.log(err);
		}
	}, intervalDelay);
})();

// Event listeners

client.on("ready", async () => {
	console.log(`Logged in as ${client.user.username}!`);
	if (nwordusages != 0) setDiscordPresence();

	// refresh members' profile pictures

	const doRefresh = true;

	if (doRefresh) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID.toString());

		const usersIds = Array.from(
			data,
			(element) => element.user && element.user.userID,
		);

		const result = await Promise.allSettled(
			(() => {
				const promises = [];
				for (const k of usersIds) {
					promises.push(client.users.fetch(k));
				}
				return promises;
			})(),
		);

		for (const element of data) {
			if (!element.user) continue;

			const fetchResult = result.find((x) => {
				if (
					x.status === "fulfilled" &&
					x.value.id === element.user.userID
				)
					return x;
			});

			if (!fetchResult) continue;
			if (!element.user.userMeta) element.user.userMeta = {};

			let [username, iconURL] = [
				fetchResult.value.username,
				fetchResult.value.displayAvatarURL(),
			];

			if (guild) {
				try {
					const member = await guild.members.fetch(
						element.user.userID,
					);
					if (member.nickname) username = member.nickname;
				} catch (err) {
					/* empty */
				}
			}

			element.user.userMeta["username"] =
				username.charAt(0).toUpperCase() + username.slice(1);
			element.user.userMeta["iconURL"] = iconURL;
		}

		changed = true;
	}
});

client.on("messageCreate", (msg) => {
	let lowercaseMessage = msg.content.toLowerCase().replace(/ /g, "");

	let userData = data.find(
		(element) => element.user && element.user.userID == msg.author.id,
	);

	if (userData && userData.user) {
		userData.user.userMeta.iconURL = msg.member.displayAvatarURL();
		userData.user.userMeta.username = msg.member.displayName;
	}

	if (checkMessage(lowercaseMessage)) {
		if (userData && userData.user) {
			if (
				msgCooldownData.has(msg.author.id) &&
				msgCooldownData.get(msg.author.id) >=
					Date.now() - coooldownMessages
			)
				return;

			userData.user.score += 1;
			msgCooldownData.set(msg.author.id, Date.now());
			scoreAfterMidnightUpdate(userData, false);

			// Leveling up related messages
			try {
				let newData = [...(data || [])].sort((a, b) => {
					if (!a.user) return 1;
					if (!b.user) return -1;
					return (
						(b.user.score != undefined ? b.user.score : 0) -
						(a.user.score != undefined ? a.user.score : 0)
					);
				}); // returns the sorted array

				let place = newData.findIndex((element) => {
					if (!element.user) return false;
					return element.user.userID == msg.author.id;
				});

				let dataOnThisUser = newData[place + 1];

				if (
					dataOnThisUser &&
					dataOnThisUser.user &&
					dataOnThisUser.user.score > 2
				) {
					if (userData.user.score - 1 == dataOnThisUser.user.score) {
						if (place > 4) return;

						msg.reply(
							lang["l_2"].format(dataOnThisUser.user.userID),
						).then(() => {
							console.log("User surpassed someone");
						});
					}
				}
			} catch (err) {
				console.log(err);
			}
		} else {
			data.push(
				new User(
					msg.author.id,
					1,
					1,
					msg.member.user.displayAvatarURL(),
					msg.member.user.username,
				),
			);
		}

		changed = true;
	}

	// To be removed in the future
	if (
		lowercaseMessage.startsWith("kys") ||
		lowercaseMessage.endsWith("kys")
	) {
		let emoji = msg.guild.emojis.cache.find(
			(emoji) => emoji.name === "this_tbh",
		);

		if (emoji) {
			msg.react(emoji);
			console.log(`Reacted with ${emoji.name}`);
		}
	}
});

client.on("messageDelete", (msg) => {
	let lowercaseMessage = msg.content.toLowerCase().replace(/ /g, "");

	if (checkMessage(lowercaseMessage)) {
		let userData = data.find(
			(element) => element.user && element.user.userID == msg.author.id,
		);

		if (userData) {
			userData.user.score -= 1;
			scoreAfterMidnightUpdate(userData, true);
			changed = true;

			console.log(
				`Message got edited : ${msg.author.username}, adding -1`,
			);
		}
	}
});

client.on("messageUpdate", (msgOld, msgNew) => {
	let [lowercaseOldMessage, lowercaseNewMessage] = [
		msgOld.content.toLowerCase().replace(/ /g, ""),
		msgNew.content.toLowerCase().replace(/ /g, ""),
	];

	if (
		checkMessage(lowercaseNewMessage) &&
		!checkMessage(lowercaseOldMessage)
	) {
		let userData = data.find(
			(element) =>
				element.user && element.user.userID == msgNew.author.id,
		);

		if (userData) {
			userData.user.score += 1;
			scoreAfterMidnightUpdate(userData, false);
			changed = true;

			console.log(
				`Message got edited : ${msgNew.author.username}, adding +1`,
			);
		}
	} else if (
		!checkMessage(lowercaseNewMessage) &&
		checkMessage(lowercaseOldMessage)
	) {
		let userData = data.find(
			(element) =>
				element.user && element.user.userID == msgNew.author.id,
		);

		if (userData) {
			userData.user.score -= 1;
			scoreAfterMidnightUpdate(userData, true);
			changed = true;

			console.log(
				`Message got edited : ${msgNew.author.username}, adding -1`,
			);
		}
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isRepliable() || !interaction.isChatInputCommand()) return;
	if (interaction.channel.guildId !== process.env.GUILD_ID) return;

	if (commands[interaction.commandName])
		commands[interaction.commandName](client, interaction, lang, data);
});

client.on("error", console.error);

// Exports and initialization

exports.getData = () => {
	return data;
};

exports.getLang = () => {
	return lang;
};

exports.getUptimeData = () => {
	return uptimeData;
};

exports.getGuildIconURL = () => {
	let guild = client.guilds.cache.get(process.env.GUILD_ID.toString());

	if (guild) {
		return guild.iconURL ? guild.iconURL() : "";
	}
};

import("./deploy.mjs");
require("./control_panel/").init();

client.login(process.env.TOKEN).catch(console.error);
