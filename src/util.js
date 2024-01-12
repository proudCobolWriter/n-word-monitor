const { ActivityType, EmbedBuilder } = require("discord.js");

function setDiscordPresence(client, botData) {
	const modulo = botData.presenceIndex % 3;

	const presenceSettings = [
		{
			activities: [
				{
					name: botData.lang.presence[0].format(botData.nwordusages),
					type: ActivityType.Watching,
				},
			],
			status: "idle",
		},
		{
			activities: [
				{
					name: botData.lang.presence[1],
					type: ActivityType.Competing,
				},
			],
			status: "online",
		},
		{
			activities: [
				{
					name: botData.lang.presence[2],
					type: ActivityType.Watching,
				},
			],
			status: "dnd",
		},
	];

	client.user.setPresence(presenceSettings[modulo]);
	console.log(
		`Successfully set bot's presence (${presenceSettings[modulo].activities[0].name})`
	);

	botData.presenceIndex++;
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

function milestoneFunction(client, botData) {
	if (botData.nwordusages % 1000 == 0 && botData.nwordusages != 0) {
		try {
			let guild = client.guilds.cache.get(
				process.env.GUILD_ID.toString()
			);

			let createEmbed = () => {
				return new EmbedBuilder()
					.setTitle(
						botData.lang["l_1"].title.format(botData.nwordusages)
					)
					.setThumbnail(guild.iconURL ? guild.iconURL() : "")
					.setTimestamp()
					.setColor("Aqua")
					.setDescription(botData.lang["l_1"].description);
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

function updateNwordUsages(data, botData) {
	botData.nwordusages = 0;
	data.forEach((element) => {
		if (element && element.user && element.user.score > 0) {
			botData.nwordusages =
				botData.nwordusages + (element.user.score || 0);
		}
	});
}

module.exports = {
	setDiscordPresence,
	checkMessage,
	scoreAfterMidnightUpdate,
	milestoneFunction,
	updateNwordUsages,
};
