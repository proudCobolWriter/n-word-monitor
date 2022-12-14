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
} = require("discord.js");
const { env } = require("process");

const client = new Client({ intents: 36481 });
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

const filePath = "db.json";
const intervalDelay = 15e3;
const commandCooldown = 10e3;
const coooldownMessages = 30e3;

// Data storage

let data = [];
let msgCooldownData = new Map();

// Command states

let changed = false;
let nwordusages = 0;

let cooldownCommand1 = 0;
let cooldownCommand2 = 0;

// Create user object

function User(userID, score, scoreAfterMidnight) {
  this.user = {
    userID: userID || -1, // discord user snowflake id
    score: score || 0, // n-word occurrences
    scoreAfterMidnight: scoreAfterMidnight || 0, // n-word occurrences this day
    day: new Date().getUTCDate(), // date "scoreAfterMidnight" corresponds to
    month: new Date().getUTCMonth(), // date "scoreAfterMidnight" corresponds to
  };
}

// Functions and event handlers

function readJSON() {
  let result = fs.readFileSync(filePath);

  try {
    result = JSON.parse(result);
  } catch {
    result = [];
    console.log("Caught an error while parsing");
  }

  return result;
}

function writeToJSON() {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.log("There was an error during the writing");
    } else {
      console.log("The file was successfully written");
      changed = false;
    }
  });
}

let odd = false;
function setDiscordPresence() {
  odd = !odd;
  if (odd) {
    client.user.setPresence({
      activities: [
        {
          name: `${nwordusages.toString()} n-words on TECN'T`,
          type: ActivityType.Watching,
        },
      ],
      status: "idle",
    });
  } else {
    client.user.setPresence({
      activities: [
        { name: "Ally is ceo of gay", type: ActivityType.Competing },
      ],
      status: "online",
    });
  }
  console.log("Successfully set bot's presence");
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
      console.log("Resetted n-word count : a new day has passed");
      userData.user.scoreAfterMidnight = removing ? 0 : 1;
      userData.user.day = new Date().getUTCDate();
      userData.user.month = new Date().getUTCMonth();
    } else {
      userData.user.scoreAfterMidnight += removing ? -1 : 1;
    }
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  if (nwordusages != 0) setDiscordPresence();
});

client.on("messageCreate", (msg) => {
  let lowercaseMessage = msg.content.toLowerCase().replace(/ /g, "");

  if (checkMessage(lowercaseMessage)) {
    let userData = data.find(
      (element) => element.user && element.user.userID == msg.author.id
    );

    if (userData && userData.user) {
      if (
        msgCooldownData.has(msg.author.id) &&
        msgCooldownData.get(msg.author.id) >= Date.now() - coooldownMessages
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

            msg
              .reply(
                `Congrats on having said the n-word more times than <@${dataOnThisUser.user.userID}>`
              )
              .then(() => {
                console.log("User surpassed someone");
              });
          }
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      data.push(new User(msg.author.id, 1, 1));
    }

    changed = true;
  }
  if (lowercaseMessage.startsWith("kys") || lowercaseMessage.endsWith("kys")) {
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
      console.log(
        `Message containing the n-word got deleted : ${msg.author.tag}`
      );
    }
  }
});

client.on("messageUpdate", (msgOld, msgNew) => {
  let [lowercaseOldMessage, lowercaseNewMessage] = [
    msgOld.content.toLowerCase().replace(/ /g, ""),
    msgNew.content.toLowerCase().replace(/ /g, ""),
  ];

  if (checkMessage(lowercaseNewMessage) && !checkMessage(lowercaseOldMessage)) {
    let userData = data.find(
      (element) => element.user && element.user.userID == msgNew.author.id
    );

    if (userData) {
      userData.user.score += 1;
      scoreAfterMidnightUpdate(userData, false);
      console.log(
        `Message containing the n-word got editted : ${msgNew.author.tag}, adding +1`
      );
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
      console.log(
        `Message containing the n-word got editted : ${msgNew.author.tag}, adding -1`
      );
    }
  }
});

function milestoneFunction() {
  if (nwordusages % 1000 == 0 && nwordusages != 0) {
    try {
      let guild = client.guilds.cache.get(process.env.GUILD_ID.toString());
      let createEmbed = () => {
        return new EmbedBuilder()
          .setTitle(
            `The ${nwordusages.toString()} ${process.env.MILESTONE_MESSAGE}`
          )
          .setThumbnail(guild.iconURL ? guild.iconURL() : "")
          .setTimestamp()
          .setColor("Aqua")
          .setDescription("Keep it up guys");
      };

      let firstChannel = guild.channels.cache.find((ch) =>
        ch.name.includes("general")
      );

      firstChannel.send({ embeds: [createEmbed()] });
    } catch (err) {
      console.log(err);
    }
  }
}

(() => {
  data = readJSON();
  if (!data || data.length == 0) {
    throw "Database is either wrong or empty";
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

  setInterval(
    () => {
      try {
        if (changed) {
          writeToJSON();
          updateNwordUsages();
          console.log("Updated, n-word counter: " + nwordusages);
          setDiscordPresence();
          milestoneFunction();
        }
      } catch (err) {
        console.log(err);
      }
    },
    intervalDelay,
    writeToJSON
  );
})();

client.on("interactionCreate", (interaction) => {
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName == "rleaderboard"
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
          let emoji = i == 0 ? "????" : i == 1 ? "????" : i == 2 ? "????" : "";
          fields.push({
            name: `${emoji} ${i + 1}# place`,
            value: `<@!${datai.user.userID.toString()}> has recorded exactly **${datai.user.score.toString()}** n-word usages`,
          });
        } else {
          break;
        }
      }

      return fields;
    };

    let createEmbed = (page, f) => {
      return new EmbedBuilder()
        .setTitle(`N-word leaderboard ????      (page #${page})`)
        .setAuthor({
          name: interaction.user.tag,
          iconURL: interaction.user.avatarURL(),
        })
        .setFooter({
          text: `You can use this command again in ${Math.floor(
            commandCooldown / 1000
          )}s   -   You have said the n-word ${
            dataOnThisUser && dataOnThisUser.user
              ? dataOnThisUser.user.score.toString()
              : "0"
          } time${
            dataOnThisUser.user.score && dataOnThisUser.user.score > 1
              ? "s"
              : ""
          }`,
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
          .setEmoji("??????")
          .setStyle(ButtonStyle.Success)
          .setDisabled(buttonToDisable == "button1"),
        new ButtonBuilder()
          .setCustomId("button2")
          .setLabel("Page right")
          .setEmoji("??????")
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
        content:
          "Bitchass you gotta run the /rleaderboard command to use the buttons",
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
      .catch((err) => console.log("Couldn't send embed on command 1 : ", err))
      .finally(() => {
        try {
          collector.on("collect", async (i) => {
            let e = i.message.embeds[0];
            let page = parseInt(
              e.data.title ? e.data.title.replace(/[^0-9]/g, "") : 1
            );
            let buttonClicked = i.customId;
            let updatedPageValue = page + (buttonClicked == "button1" ? -1 : 1);
            let buttonToGreyOut = updatedPageValue > 1 ? "none" : "button1";
            if (
              getFields(updatedPageValue + 1).length == 0 &&
              buttonToGreyOut != "button1"
            )
              buttonToGreyOut = "button2";

            await i.update({
              embeds: [
                createEmbed(updatedPageValue, getFields(updatedPageValue)),
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
    interaction.commandName == "rranking"
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
      descriptionString = `Lame, you have never said the n-word.`;
    } else {
      if (place != 0) {
        descriptionString = `Congrats for having made it up to the **#${(
          place + 1
        ).toString()}** place! You have said the n-word a whopping **${
          dataOnThisUser.user.score != undefined
            ? dataOnThisUser.user.score.toString()
            : "0"
        }** time${
          dataOnThisUser.user.score && dataOnThisUser.user.score > 1 ? "s" : ""
        }.
                \n You are just behind ${
                  "<@!" +
                    ((newData[place - 1] || []).user || []).userID +
                    ">" || "nobody lol"
                }`;
      } else {
        descriptionString = `youre a zaza addict bro you have made to the **#1** place! You have said the n-word a whopping ${
          dataOnThisUser.user.score != undefined
            ? dataOnThisUser.user.score.toString()
            : "0"
        } times.`;
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
        console.log("Resetted n-word count : a new day has passed");
        dataOnThisUser.user.scoreAfterMidnight = 0;
        dataOnThisUser.user.day = new Date().getUTCDate();
        dataOnThisUser.user.month = new Date().getUTCMonth();
        scoreAfterMidnight = 0;
      } else {
        scoreAfterMidnight = dataOnThisUser.user.scoreAfterMidnight;
      }
    } else {
      if (dataOnThisUser && dataOnThisUser.user) {
        console.log("Data is missing on day and scoreAfterMidnight keys");
      }
    }

    let embed2 = new EmbedBuilder()
      .setTitle(
        `Your rizz: ${
          !dataOnThisUser ? "0" : (dataOnThisUser.user.score * 3.5).toString()
        } bitches/night`
      ) // n-word prestige
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
        `${descriptionString}\n\n**You have said the n-word** ***__${scoreAfterMidnight} time${
          scoreAfterMidnight > 1 ? "s" : ""
        }__*** **today**`
      );

    interaction
      .reply({ embeds: [embed2] })
      .catch((err) => console.log("Couldn't send embed on command 2"));
  }
});

(async function setupSlashCommands() {
  const commands = [
    {
      name: "rleaderboard",
      description: "Find out who's the most based here",
    },
    {
      name: "rranking",
      description: "Displays your ranking in the leaderboard",
      options: [
        {
          name: "member",
          description: "the person you want to look up",
          type: 6,
          required: false,
        },
      ],
    },
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

client.login(process.env.TOKEN).catch(console.error);
