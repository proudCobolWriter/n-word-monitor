// Dependencies

const { EmbedBuilder } = require("discord.js");

// Export

module.exports = async (client, interaction, lang, data) => {
	await interaction.deferReply();

	if (
		/*cooldownCommand2 >= Date.now() - commandCooldown &&*/
		interaction.channelId != process.env.BOT_COMMS_CHANNEL_ID
	) {
		console.log("Attention cooldown command2");
		return;
	}
	//cooldownCommand2 = Date.now();

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
				"<@!" + ((newData[place - 1] || []).user || []).userID + ">" ||
					"nobody lol"
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
		dataOnThisUser != undefined &&
		dataOnThisUser.user != undefined &&
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
				`Data is potentially missing on "scoreAfterMidnight", "day" and "month" keys`
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
			name: nonselfUser
				? nonselfUser.member.displayName
				: interaction.member.displayName,
			iconURL: nonselfUser
				? nonselfUser.member.displayAvatarURL()
				: interaction.member.displayAvatarURL(),
		})
		.setFooter({
			text: `You can use this command again in ${Math.floor(
				/*commandCooldown*/ 1000 / 1000
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

	interaction.followUp({ embeds: [embed2] }).catch((err) => {
		console.log("Couldn't send embed on command 2!");
		console.error(err);
	});
};
