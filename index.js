require("dotenv").config({path : ".env"});

const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Client, GatewayIntentBits, Routes, EmbedBuilder, ActivityType } = require("discord.js");

const client = new Client({ intents: 36481 });
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const filePath = 'db.json';
const intervalDelayInSec = 15;
const commandCooldownInSec = 7;

let data = [];
let changed = false;

let nwordusages = 0;

let cooldownCommand1 = 0;
let cooldownCommand2 = 0;

function Post(userID, score) {
    this.user = {
        userID: userID || -1,
        score: score || 0,
    };
};

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
};

function writeToJSON() {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), err => {
        if (err) {
            console.log("There was an error during the writing");
        } else {
            console.log("The file was successfully written");
            changed = false;
            nwordusages = nwordusages;
        };
    });
};

let odd = false
function setDiscordPresence() {
    odd = !odd;
    if (odd) {
        client.user.setPresence({
            activities: [{ name: `${nwordusages.toString()} n-words on TECN'T`, type: ActivityType.Watching }],
            status: 'idle',
        });
    } else {
        client.user.setPresence({
            activities: [{ name: "Ally is ceo of gay", type: ActivityType.Competing }],
            status: 'online',
        });
    }
    console.log("Changed bot's rich presence");
};

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    if (nwordusages != 0) setDiscordPresence();
});

client.on("messageCreate", (msg) => {
    let lowercaseMessage = msg.content.toLowerCase().replace(/ /g,'');

    if (lowercaseMessage.includes("nigger") || lowercaseMessage.includes("nigga") || lowercaseMessage.includes("nick gurr") || lowercaseMessage.includes("nickgurr") || lowercaseMessage.includes("nigg") || lowercaseMessage.includes("negro")) {
        let userData = data.find(element => element.user && element.user.userID == msg.author.id);

        if (userData) {
            userData.user.score += 1;

            // Leveling up related messages
            try {
                let newData = [...(data || [])].sort((a, b) => {
                    if (!a.user) return 1;
                    if (!b.user) return -1;
                    return (b.user.score || 0) - (a.user.score || 0)
                }); // returns the sorted array

                let place = newData.findIndex((element) => {
                    if (!element.user) return false;
                    return element.user.userID == msg.author.id
                });

                let dataOnThisUser = newData[place + 1];

                if (userData.user.score > 2 && dataOnThisUser && dataOnThisUser.user) {
                    if (userData.user.score == dataOnThisUser.user.score - 1) {
                        msg.reply(`Congrats on having said the n-word more times than <@${dataOnThisUser.user.userID}>`).then(() =>
                            msg.delete()
                        , 10000);
                    };
                };
            } catch (err) { console.log(err); };
        } else {
            data.push(new Post(msg.author.id, 1));
        };

        changed = true;
    };
    if (lowercaseMessage.startsWith("kys") || lowercaseMessage.endsWith("kys")) {
        let emoji = msg.guild.emojis.cache.find(emoji => emoji.name === 'this_tbh');

        if (emoji) { msg.react(emoji); console.log(`Reacted with ${emoji.name}`); };
    };
});

(() => {
    data = readJSON();
    if (!data || data.length == 0) { throw "Data is wrong" };

    let updateNwordUsages = function () {
        nwordusages = 0;
        data.forEach((element) => {
            if (element && element.user) {
                nwordusages = nwordusages + (element.user.score || 0);
            }
        });
    };
    updateNwordUsages();

    setInterval(() => {
        try {
            if (changed) {
                writeToJSON();
                updateNwordUsages();
                console.log("Updated, n-word counter: " + nwordusages);
                setDiscordPresence();
            };
        } catch (err) { console.log(err); };
    }, intervalDelayInSec * 1000, writeToJSON);
})();

client.on("interactionCreate", (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName == "rleaderboard") {
        if (cooldownCommand1 >= (Date.now() - commandCooldownInSec * 1000) && interaction.channelId != process.env.BOT_COMMS_CHANNEL_ID) { console.log("attention cooldown"); return };
        cooldownCommand1 = Date.now();

        let newData = [...(data || [])].sort((a, b) => {
            if (!a.user) return 1;
            if (!b.user) return -1;
            return (b.user.score || 0) - (a.user.score || 0)
        }); // returns the sorted array

        let fields = [];
        for (let i = 0; i < 5; i++) {
            let datai = newData[i];

            if (datai && datai.user) {
                let emoji = i == 0 ? "🥇" : (i == 1 ? "🥈" : (i == 2 ? "🥉" : ""));
                fields.push({ name: `${emoji} ${i + 1}# place`, value: `<@!${datai.user.userID.toString()}> has recorded exactly **${datai.user.score.toString()}** n-word usages` });
            } else { break };
        };

        let dataOnThisUser = newData.find((element) => {
            if (!element.user) return false;
            return element.user.userID == interaction.user.id
        });

        let embed = new EmbedBuilder()
        .setTitle("N-word leaderboard 🏆")
        .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.avatarURL(),
        })
        .setFooter({ text: `Please use this command again in ${commandCooldownInSec}s   -   You have said the n-word ${dataOnThisUser && dataOnThisUser.user ? dataOnThisUser.user.score.toString() : "0"} time${dataOnThisUser.user.score && dataOnThisUser.user.score > 1 ? "s" : ""}`, iconURL: client.user.defaultAvatarURL })
        .setTimestamp()
        .setColor("Blurple")
        .addFields(fields)
        .setDescription("\n");

        interaction.reply({ embeds: [embed] }).catch(err => console.log("Couldn't send embed on command 1"));
    } else if (interaction.commandName == "rranking") {
        if (cooldownCommand2 >= (Date.now() - commandCooldownInSec * 1000) && interaction.channelId != process.env.BOT_COMMS_CHANNEL_ID) { console.log("attention cooldown"); return };
        cooldownCommand2 = Date.now();

        let nonselfUser = interaction.options.data[0];

        let newData = [...(data || [])].sort((a, b) => {
            if (!a.user) return 1;
            if (!b.user) return -1;
            return (b.user.score || 0) - (a.user.score || 0)
        }); // returns the sorted array

        let descriptionString = "";
        let place = newData.findIndex((element) => {
            if (!element.user) return false;
            return element.user.userID == (nonselfUser ? nonselfUser.user.id : interaction.user.id)
        });

        let dataOnThisUser = data.find((element) => {
            if (!element.user) return false;
            return element.user.userID == (nonselfUser ? nonselfUser.user.id : interaction.user.id)
        });

        if (!dataOnThisUser || !dataOnThisUser.user) {
            descriptionString = `Lame, you have never said the n-word.`;
        } else {
            if (place != 0) {
                descriptionString = `Congrats for having made it up to the **#${(place + 1).toString()}** place! You have said the n-word a whopping **${dataOnThisUser.user.score ? dataOnThisUser.user.score.toString() : "0"}** time${dataOnThisUser.user.score && dataOnThisUser.user.score > 1 ? "s" : ""}.
                \n You are just behind ${ ("<@!" + (((newData[place - 1] || []).user) || []).userID + ">") || "nobody lol" }`;
            } else {
                descriptionString = `youre a zaza addict bro you have made to the **#1** place! You have said the n-word a whopping ${dataOnThisUser.user.score ? dataOnThisUser.user.score.toString() : "0"} times.`;
            };
        };

        let embed2 = new EmbedBuilder()
        .setTitle(`Your n-word prestige: ${!dataOnThisUser ? "0" : (dataOnThisUser.user.score * 3.5).toString()}`)
        .setAuthor({
            name: nonselfUser ? nonselfUser.user.tag : interaction.user.tag,
            iconURL: nonselfUser ? nonselfUser.user.avatarURL() : interaction.user.avatarURL(),
        })
        .setFooter({ text: `Please use this command again in ${commandCooldownInSec}s`, iconURL: client.user.defaultAvatarURL })
        .setTimestamp()
        .setColor("Greyple")
        .setDescription(descriptionString);

        interaction.reply({ embeds: [embed2] }).catch(err => console.log("Couldn't send embed on command 2"));
    };
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
        }
    ]

    try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
            body: commands,
        });
    } catch (err) { console.log(err); };
})();





client.login(process.env.TOKEN);
