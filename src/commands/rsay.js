// Utility functions

const timeout = (s) => {
	return new Promise((resolve) => setTimeout(resolve, s * 1000));
};

// Export

module.exports = async (client, interaction) => {
	await interaction.deferReply({ ephemeral: true });

	let isMemberAdmin = interaction.member
		.permissionsIn(interaction.channel)
		.has("ADMINISTRATOR");

	if (!isMemberAdmin) {
		interaction
			.followUp(
				"You need the __**ADMINISTRATOR**__ permission to use this command!"
			)
			.catch(console.error);
		return;
	}

	let options = interaction.options.data;
	let channelOption = options[1];

	if (channelOption && channelOption.name === "channel") {
		channelOption = channelOption.channel;
	} else {
		channelOption = interaction.channel;
	}

	let messageToReply = options.find((x) => x.name === "reply");

	try {
		let canSendMsg = client.guilds.cache
			.get(interaction.channel.guildId)
			.members.me.permissionsIn(channelOption.id)
			.has("SEND_MESSAGES");

		if (!canSendMsg)
			throw new Error(
				`No send/read permissions in channel ${channelOption.name}`
			);

		const attachment = interaction.options.getAttachment("attachment");
		const messageContent = {
			content: options[0].value,
		};

		if (attachment) {
			messageContent.files = [
				{
					attachment: attachment.url,
					name: attachment.name,
					description: "Sent from the bot",
				},
			];
		}

		channelOption.sendTyping();

		await timeout(3);

		if (messageToReply) {
			try {
				const invalidSnowflake = !/^\d*$/.test(messageToReply.value);

				if (invalidSnowflake) {
					interaction
						.followUp(
							"The message ID you provided is invalid! It must be a valid Discord snowflake containing numbers. Make sure to enable the Dev Tools to get that."
						)
						.catch(console.error);
				} else {
					const replyToMessage = await channelOption.messages.fetch(
						messageToReply.value
					);

					replyToMessage.reply(messageContent);
				}
			} catch (err) {
				console.error(err);
				interaction
					.followUp(`Message couldn't be sent!`)
					.catch(console.error);
			}
			return;
		} else {
			channelOption.send(messageContent);
		}

		interaction
			.followUp(`Message successfully sent in ${channelOption.name}!`)
			.catch(console.error);
	} catch (err) {
		console.error(err);
		interaction
			.followUp(`Message couldn't be sent in ${channelOption.name}.`)
			.catch(console.error);
	}
};
