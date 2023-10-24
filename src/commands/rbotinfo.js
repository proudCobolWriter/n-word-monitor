// Dependencies

const { EmbedBuilder } = require("discord.js");

// Export

module.exports = async (client, interaction, lang) => {
	await interaction.deferReply({ ephemeral: true });

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

	interaction.followUp({ embeds: [embed3] }).catch((err) => {
		console.log("Couldn't send embed on command 3!");
		console.error(err);
	});
};
