// Dependencies

const { EmbedBuilder } = require("discord.js");

// Export

// TODO: rewrite this code smarter
module.exports = async (_, interaction, lang, data) => {
	await interaction.deferReply();

	let nonselfUser = interaction.options.data[0];
	let isSelf = !nonselfUser || nonselfUser.user.id === interaction.user.id;

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

	let dataOnCommandPosterUser = data.find((element) => {
		if (!element.user) return false;
		return element.user.userID == interaction.user.id;
	});

	if (!dataOnThisUser || !dataOnThisUser.user) {
		if (isSelf) {
			descriptionString = lang["l_5"];
		} else {
			descriptionString = lang["l_5b"].format(
				nonselfUser.user.displayName
			);
		}
	} else {
		if (place != 0) {
			if (isSelf) {
				descriptionString = lang["l_6"].format(
					place + 1,
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0",
					"<@!" + ((newData[place - 1] || []).user || []).userID + ">"
				);
			} else {
				descriptionString = lang["l_6b"].format(
					nonselfUser.user.displayName,
					place + 1,
					nonselfUser.user.displayName,
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0",
					nonselfUser.user.displayName,
					"<@!" + ((newData[place - 1] || []).user || []).userID + ">"
				);
			}
		} else {
			if (isSelf) {
				descriptionString = lang["l_7"].format(
					place + 1,
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0"
				);
			} else {
				descriptionString = lang["l_7b"].format(
					nonselfUser.user.displayName,
					place + 1,
					nonselfUser.user.displayName,
					dataOnThisUser.user.score != undefined
						? dataOnThisUser.user.score
						: "0"
				);
			}
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

	let title = lang[isSelf ? "l_11" : "l_11b"];
	if (isSelf) {
		title = title.format(
			!dataOnThisUser ? "0" : dataOnThisUser.user.score * 3.5
		);
	} else {
		title = title.format(
			nonselfUser.user.displayName,
			!dataOnThisUser ? "0" : dataOnThisUser.user.score * 3.5
		);
	}

	let description = lang[isSelf ? "l_9" : "l_9b"];
	if (isSelf) {
		description = description.format(descriptionString, scoreAfterMidnight);
	} else {
		description = description.format(
			descriptionString,
			nonselfUser.user.displayName,
			scoreAfterMidnight
		);
	}

	let embed2 = new EmbedBuilder()
		.setTitle(title)
		.setAuthor({
			name: nonselfUser
				? nonselfUser.member.displayName
				: interaction.member.displayName,
			iconURL: nonselfUser
				? nonselfUser.member.displayAvatarURL()
				: interaction.member.displayAvatarURL(),
		})
		.setFooter({
			text: isSelf
				? interaction.member.displayName
				: lang["l_8"].format(
						dataOnCommandPosterUser && dataOnCommandPosterUser.user
							? dataOnCommandPosterUser.user.score
							: "0"
				  ),
			iconURL: interaction.member.displayAvatarURL(),
		})
		.setTimestamp()
		.setColor("Greyple")
		.setDescription(description);

	interaction.followUp({ embeds: [embed2] }).catch((err) => {
		console.log("Couldn't send embed on command rranking!");
		console.error(err);
	});
};
