// Dependencies

const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");

// Export

module.exports = async (_, interaction, lang, data) => {
	await interaction.deferReply();

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
				let emoji = i == 0 ? "🥇" : i == 1 ? "🥈" : i == 2 ? "🥉" : "";
				fields.push({
					name: `${emoji} ${i + 1}# place`,
					value: lang["l_4"].format(
						datai.user.userID,
						datai.user.score,
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
				name: interaction.member.displayName,
				iconURL: interaction.member.displayAvatarURL(),
			})
			.setFooter({
				text: lang["l_8"].format(
					dataOnThisUser && dataOnThisUser.user
						? dataOnThisUser.user.score
						: "0",
				),
				iconURL: interaction.member.displayAvatarURL(),
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
				.setDisabled(buttonToDisable == "button2"),
		);
	};

	const filter = (i) => {
		if (i.user.id === interaction.user.id) return true;

		console.log(
			`${i.member.displayName} tried using buttons on a command used by ${interaction.member.displayName}`,
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
		.followUp({
			embeds: [createEmbed(1, getFields(1))],
			components: [createActionRow("button1")],
		})
		.catch((err) => {
			console.log("Couldn't send embed on command rbotleaderboard!");
			console.error(err);
		})
		.finally(() => {
			try {
				collector.on("collect", async (i) => {
					let e = i.message.embeds[0];
					let page = parseInt(
						e.data.title ? e.data.title.replace(/[^0-9]/g, "") : 1,
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

					try {
						await i.update({
							embeds: [
								createEmbed(
									updatedPageValue,
									getFields(updatedPageValue),
								),
							],
							components: [createActionRow(buttonToGreyOut)],
						});
					} catch (err) {
						console.log(
							"Error occured when editing the leaderboard embed :",
						);
						console.error(err);
					}
				});
			} catch (err) {
				console.log("Error occured at button collector : ");
				console.error(err);
			}
		});
};
