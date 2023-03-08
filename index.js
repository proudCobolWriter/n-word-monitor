require("dotenv").config({ path: ".env" });

// Dependencies

const fs = require("fs");
const winston = require("winston");
const { REST } = require("@discordjs/rest");
const {
	Client,
	GatewayIntentBits,
	Routes,
	EmbedBuilder,
	ActivityType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	IntentsBitField,
} = require("discord.js");

const botIntents = new IntentsBitField();
botIntents.add(
	IntentsBitField.Flags.Guilds,
	IntentsBitField.Flags.GuildMembers,
	IntentsBitField.Flags.GuildMessages,
	IntentsBitField.Flags.MessageContent,
	IntentsBitField.Flags.GuildMessageReactions
);

const client = new Client({
	intents: botIntents,
});
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Logging setup

const logger = winston.createLogger({
	defaultMeta: { service: "user-service" },
	exitOnError: false,
	colorize: true,
	transports: [
		new winston.transports.File({ filename: "logs/combined.log" }),
		new winston.transports.Console(),
	],
	format: winston.format.combine(
		winston.format.timestamp({
			format: "MMM-DD-YYYY HH:mm:ss",
		}),
		winston.format.colorize(),
		winston.format.printf(({ level, message, timestamp, stack }) => {
			if (stack) {
				return `${level}: BOT-LOGS: ${timestamp}: ${stack}`;
			}
			return `${level}: BOT-LOGS: ${timestamp}: ${message}`;
		})
	),
});

console.log = (d) => {
	logger.info(d);
};

console.error = (d) => {
	logger.error(new Error(d));
};

// Constants

const intervalDelay = 15e3;
const commandCooldown = 10e3;
const coooldownMessages = 30e3;

// Data storage

let data = [];
let lang = {};
let msgCooldownData = new Map();

// Command states

let changed = false;
let nwordusages = 0;

let cooldownCommand1 = 0;
let cooldownCommand2 = 0;

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
		userPFP: userPFP || "./favicon.ico", // the profile picture of the user (updated everytime the same user chats on the server)
	};
}

// Prototype extensions

String.prototype.format = function () {
	a = this;
	for (k in arguments) {
		a = a.replace("{" + k + "}", arguments[k]);
	}
	return a;
};

// Functions and event handlers

function readJSON(p) {
	let result = fs.readFileSync(p);

	try {
		result = JSON.parse(result);
	} catch {
		result = [];
		console.log("Caught an error while parsing");
	}

	return result;
}

function writeToJSON(p) {
	fs.writeFile(p, JSON.stringify(data, null, 2), (err) => {
		if (err) {
			console.log("There was an error during the writing");
		} else {
			console.log("The file was successfully written");
			changed = false;
		}
	});
}

let presenceIndex = 2; //0;
function setDiscordPresence() {
	const modulo = presenceIndex % 3;
	const presenceSettings = [
		{
			activities: [
				{
					name: lang.presence[modulo].format(nwordusages),
					type: ActivityType.Watching,
				},
			],
			status: "idle",
		},
		{
			activities: [
				{
					name: lang.presence[modulo],
					type: ActivityType.Competing,
				},
			],
			status: "online",
		},
		{
			activities: [
				{
					name: lang.presence[modulo],
					type: ActivityType.Custom,
					url: lang["l_0"][1].value.format(
						process.env.HOST_URL,
						process.env.HOST_PORT
					),
				},
			],
			status: "online",
		},
	];

	client.user.setPresence(presenceSettings[modulo]);

	presenceIndex++;
	console.log(
		`Successfully set bot's presence ${presenceSettings[modulo].activities.name}`
	);
}

function checkMessage(lowercaseMessage) {
	const explicitWords = process.env.EXPLICIT_WORDS.split(",");
	const isExplicit = explicitWords.some((word) =>
		lowercaseMessage.includes(word)
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

client.on("ready", async () => {
	console.log(`Logged in as ${client.user.tag}!`);
	if (nwordusages != 0) setDiscordPresence();

	const refreshMemberProfiles = false; // use with caution, this might wipe profile picture/username from members who have left the server but remain on the leaderboard

	if (refreshMemberProfiles) {
		let guild = client.guilds.cache.get(process.env.GUILD_ID.toString());

		if (guild)
			try {
				const members = await guild.members.fetch({ force: true });

				members.forEach((member) => {
					let userData = data.find(
						(element) =>
							element.user && element.user.userID == member.id
					);

					if (userData && userData.user) {
						userData.user.userMeta.iconURL =
							member.user.displayAvatarURL();
						userData.user.userMeta.username = member.user.username;
					}
				});

				console.log(
					"Members' profiles have been successfuly refreshed"
				);
				changed = true;
			} catch (err) {
				console.error(err);
			}
	}
});

client.on("messageCreate", (msg) => {
	let lowercaseMessage = msg.content.toLowerCase().replace(/ /g, "");

	let userData = data.find(
		(element) => element.user && element.user.userID == msg.author.id
	);

	if (userData && userData.user) {
		userData.user.userMeta.iconURL = msg.member.user.displayAvatarURL();
		userData.user.userMeta.username = msg.member.user.username;
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
							lang["l_2"].format(dataOnThisUser.user.userID)
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
					msg.member.user.username
				)
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
			(emoji) => emoji.name === "this_tbh"
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
			(element) => element.user && element.user.userID == msg.author.id
		);

		if (userData) {
			userData.user.score -= 1;
			console.log(`Message got edited : ${msg.author.tag}, adding -1`);
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
			(element) => element.user && element.user.userID == msgNew.author.id
		);

		if (userData) {
			userData.user.score += 1;
			scoreAfterMidnightUpdate(userData, false);

			console.log(`Message got edited : ${msgNew.author.tag}, adding +1`);
		}
	} else if (
		!checkMessage(lowercaseNewMessage) &&
		checkMessage(lowercaseOldMessage)
	) {
		let userData = data.find(
			(element) => element.user && element.user.userID == msgNew.author.id
		);

		if (userData) {
			userData.user.score -= 1;
			scoreAfterMidnightUpdate(userData, true);

			console.log(`Message got edited : ${msgNew.author.tag}, adding -1`);
		}
	}
});

function milestoneFunction() {
	if (nwordusages % 1000 == 0 && nwordusages != 0) {
		try {
			let guild = client.guilds.cache.get(
				process.env.GUILD_ID.toString()
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
				ch.name.includes("general")
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
	data = readJSON("db.json");
	lang = readJSON("lang.json");

	if (!data || data.length == 0) {
		throw "Database is either skewed or empty";
	}

	if (!lang || Object.keys(lang).length == 0) {
		throw "Couldn't retrieve lang data";
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
			if (changed) {
				writeToJSON("db.json");
				updateNwordUsages();
				setDiscordPresence();
				milestoneFunction();
			}
		} catch (err) {
			console.log(err);
		}
	}, intervalDelay);
})();

client.on("interactionCreate", (interaction) => {
	if (
		interaction.isChatInputCommand() &&
		interaction.commandName == lang.commands[0].name
	) {
		if (
			cooldownCommand1 >= Date.now() - commandCooldown &&
			interaction.channelId != process.env.BOT_COMMS_CHANNEL_ID
		) {
			console.log("Attention cooldown command1");
			return;
		}
		cooldownCommand1 = Date.now();

		let newData = [...(data || [])].sort((a, b) => {
			if (!a.user) return 1;
			if (!b.user) return -1;
			return (
				(b.user.score != undefined ? b.user.score : 0) -
				(a.user.score != undefined ? a.user.score : 0)
			);
		}); // returns the sorted array

		let dataOnThisUser = newData.find((element) => {
			if (!element.user) return false;
			return element.user.userID == interaction.user.id;
		});

		let getFields = (page) => {
			let fields = [];

			for (let i = 5 * (page - 1); i < 5 * page; i++) {
				let datai = newData[i];

				if (datai && datai.user) {
					let emoji =
						i == 0 ? "🥇" : i == 1 ? "🥈" : i == 2 ? "🥉" : "";
					fields.push({
						name: `${emoji} ${i + 1}# place`,
						value: lang["l_4"].format(
							datai.user.userID,
							datai.user.score
						),
					});
				} else {
					break;
				}
			}

			return fields;
		};

		let createEmbed = (page, f) => {
			return new EmbedBuilder()
				.setTitle(lang["l_3"].format(page))
				.setAuthor({
					name: interaction.user.tag,
					iconURL: interaction.user.avatarURL(),
				})
				.setFooter({
					text: lang["l_8"].format(
						Math.floor(commandCooldown / 1000),
						dataOnThisUser && dataOnThisUser.user
							? dataOnThisUser.user.score
							: "0",
						dataOnThisUser.user.score &&
							dataOnThisUser.user.score > 1
							? "s"
							: ""
					),
					iconURL: client.user.defaultAvatarURL,
				})
				.setTimestamp()
				.setColor("Blurple")
				.addFields(f)
				.setDescription("\n");
		};

		let createActionRow = (buttonToDisable) => {
			return new ActionRowBuilder().setComponents(
				new ButtonBuilder()
					.setCustomId("button1")
					.setLabel("Page left")
					.setEmoji("⬅️")
					.setStyle(ButtonStyle.Success)
					.setDisabled(buttonToDisable == "button1"),
				new ButtonBuilder()
					.setCustomId("button2")
					.setLabel("Page right")
					.setEmoji("➡️")
					.setStyle(ButtonStyle.Success)
					.setDisabled(buttonToDisable == "button2")
			);
		};

		const filter = (i) => {
			if (i.user.id === interaction.user.id) return true;

			console.log(
				`${i.user.tag} tried using buttons on a command used by ${interaction.user.tag}`
			);
			i.reply({
				content: lang["l_10"],
				ephemeral: true,
			});

			return false;
		};

		const collector = interaction.channel.createMessageComponentCollector({
			filter,
			time: 300e3,
		});

		interaction
			.reply({
				embeds: [createEmbed(1, getFields(1))],
				components: [createActionRow("button1")],
			})
			.catch((err) =>
				console.log("Couldn't send embed on command 1 : ", err)
			)
			.finally(() => {
				try {
					collector.on("collect", async (i) => {
						let e = i.message.embeds[0];
						let page = parseInt(
							e.data.title
								? e.data.title.replace(/[^0-9]/g, "")
								: 1
						);
						let buttonClicked = i.customId;
						let updatedPageValue =
							page + (buttonClicked == "button1" ? -1 : 1);
						let buttonToGreyOut =
							updatedPageValue > 1 ? "none" : "button1";
						if (
							getFields(updatedPageValue + 1).length == 0 &&
							buttonToGreyOut != "button1"
						)
							buttonToGreyOut = "button2";

						await i.update({
							embeds: [
								createEmbed(
									updatedPageValue,
									getFields(updatedPageValue)
								),
							],
							components: [createActionRow(buttonToGreyOut)],
						});
					});
				} catch (err) {
					console.log("Error occured at button collector : ", err);
				}
			});
	} else if (
		interaction.isChatInputCommand() &&
		interaction.commandName == lang.commands[1].name
	) {
		if (
			cooldownCommand2 >= Date.now() - commandCooldown &&
			interaction.channelId != process.env.BOT_COMMS_CHANNEL_ID
		) {
			console.log("Attention cooldown command2");
			return;
		}
		cooldownCommand2 = Date.now();

		let nonselfUser = interaction.options.data[0];

		let newData = [...(data || [])].sort((a, b) => {
			if (!a.user) return 1;
			if (!b.user) return -1;
			return (
				(b.user.score != undefined ? b.user.score : 0) -
				(a.user.score != undefined ? a.user.score : 0)
			);
		}); // returns the sorted array

		let descriptionString = "";
		let place = newData.findIndex((element) => {
			if (!element.user) return false;
			return (
				element.user.userID ==
				(nonselfUser ? nonselfUser.user.id : interaction.user.id)
			);
		});

		let dataOnThisUser = data.find((element) => {
			if (!element.user) return false;
			return (
				element.user.userID ==
				(nonselfUser ? nonselfUser.user.id : interaction.user.id)
			);
		});

		if (!dataOnThisUser || !dataOnThisUser.user) {
			descriptionString = lang["l_5"];
		} else {
			if (place != 0) {
				descriptionString = lang["l_6"].format(
					place + 1,
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0",
					dataOnThisUser.user.score && dataOnThisUser.user.score > 1
						? "s"
						: "",
					"<@!" +
						((newData[place - 1] || []).user || []).userID +
						">" || "nobody lol"
				);
			} else {
				descriptionString = lang["l_7"].format(
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0"
				);
			}
		}

		let scoreAfterMidnight = 0;
		if (
			dataOnThisUser.user.scoreAfterMidnight != undefined &&
			dataOnThisUser.user.day != undefined &&
			dataOnThisUser.user.month != undefined
		) {
			if (
				dataOnThisUser.user.day != new Date().getUTCDate() ||
				dataOnThisUser.user.month != new Date().getUTCMonth()
			) {
				console.log("Resetted count : a new day has passed");
				dataOnThisUser.user.scoreAfterMidnight = 0;
				dataOnThisUser.user.day = new Date().getUTCDate();
				dataOnThisUser.user.month = new Date().getUTCMonth();
				scoreAfterMidnight = 0;
			} else {
				scoreAfterMidnight = dataOnThisUser.user.scoreAfterMidnight;
			}
		} else {
			if (dataOnThisUser && dataOnThisUser.user) {
				console.log(
					"Data is missing on day and scoreAfterMidnight keys"
				);
			}
		}

		let embed2 = new EmbedBuilder()
			.setTitle(
				lang["l_11"].format(
					!dataOnThisUser ? "0" : dataOnThisUser.user.score * 3.5
				)
			) // prestige
			.setAuthor({
				name: nonselfUser ? nonselfUser.user.tag : interaction.user.tag,
				iconURL: nonselfUser
					? nonselfUser.user.avatarURL()
					: interaction.user.avatarURL(),
			})
			.setFooter({
				text: `You can use this command again in ${Math.floor(
					commandCooldown / 1000
				)}s`,
				iconURL: client.user.defaultAvatarURL,
			})
			.setTimestamp()
			.setColor("Greyple")
			.setDescription(
				lang["l_9"].format(
					descriptionString,
					scoreAfterMidnight,
					scoreAfterMidnight > 1 ? "s" : ""
				)
			);

		interaction
			.reply({ embeds: [embed2] })
			.catch((err) => console.log("Couldn't send embed on command 2"));
	} else if (
		interaction.isChatInputCommand() &&
		interaction.commandName == lang.commands[2].name
	) {
		let embed3 = new EmbedBuilder()
			.setTitle("Bot information ⬇️")
			.setColor(0x1b1e1e)
			.addFields([
				{
					...lang["l_0"][0],
					inline: true,
				},
				...Array(1).fill({
					// choose how much empty fields we want here
					name: "\u200b",
					value: "\u200b",
					inline: true,
				}),
				{
					name: lang["l_0"][1].name,
					value: lang["l_0"][1].value.format(
						process.env.HOST_URL,
						process.env.HOST_PORT
					),
					inline: true,
				},
			]);

		interaction
			.reply({ embeds: [embed3], ephemeral: true })
			.catch((err) => console.log("Couldn't send embed on command 3"));
	}
});

(async function setupSlashCommands() {
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

	try {
		console.log("Started refreshing application (/) commands.");
		await rest.put(
			Routes.applicationGuildCommands(
				process.env.CLIENT_ID,
				process.env.GUILD_ID
			),
			{
				body: commands,
			}
		);
	} catch (err) {
		console.log(err);
	}
})();

exports.getData = () => {
	return data;
};

exports.getLang = () => {
	return lang;
};

exports.getGuildIconURL = () => {
	let guild = client.guilds.cache.get(process.env.GUILD_ID.toString());

	if (guild) {
		return guild.iconURL ? guild.iconURL() : "";
	}
};

require("./control_panel/").init();

client.login(process.env.TOKEN).catch(console.error);
