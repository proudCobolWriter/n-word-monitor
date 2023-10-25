// Dependencies

const { EmbedBuilder } = require("discord.js");

const bot = require("../");

// Export

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

module.exports = async (_, interaction) => {
	await interaction.deferReply({ ephemeral: false });

	let uptimeData = bot.getUptimeData();
	let hoursSinceStart =
		(new Date().getTime() / 1000 - uptimeData.startOfRecording) / 3600;

	let botRuntimeHours = (uptimeData.recordings * 15) / 3600;
	let runtime = clamp(
		Number(botRuntimeHours / hoursSinceStart).toFixed(2),
		0,
		1
	);

	let str = "";
	for (let k = 0; k < 22; k++) {
		let percentage = k / 21;
		str = str + (percentage < runtime ? "🟩" : "❌");
	}

	let embed = new EmbedBuilder()
		.setTitle("🕰️ Bot's uptime ⬇️")
		.setFooter({
			text: interaction.member.displayName,
			iconURL: interaction.member.displayAvatarURL(),
		})
		.setTimestamp()
		.setColor("Greyple")
		.setDescription(
			`The bot uptime is roughly of **${
				runtime * 100
			}%** (data recorded since ${new Date(
				uptimeData.startOfRecording * 1000
			).toLocaleDateString("en-GB", { timeZone: "UTC" })})\n${str}`
		);

	interaction.followUp({ embeds: [embed] }).catch((err) => {
		console.log("Couldn't send embed on command ruptime!");
		console.error(err);
	});
};
