# N-word monitor bot

<div>
<img src="https://media.tenor.com/GryShD35-psAAAAM/troll-face-creepy-smile.gif" width=18px align="center"> Don't mind this repo, it is a personal bot.
</img>
</div>

## root **.env** content

```
TOKEN = "DISCORD BOT TOKEN"
CLIENT_ID = "DISCORD BOT CLIENT ID"
GUILD_ID = "DISCORD SERVER ID OF THE HOST SERVER"

EXPLICIT_WORDS = "Bad word n°1, bad word n°2, etc"

PIXABAY_API_KEY = "PIXABAY REST API KEY (necessary to retrieve stock video wallpapers which are run in the background in the bot panel)"

HOST_URL = "WEBSERVER URL"
HOST_PORT = "WEBSERVER PORT"
```

## Running the bot

The bot can be run by either running **startup.sh** or entering "**npm** run start". (or "**npm** run start-docker" if you are using docker, make sure the container is built, "**docker** compose up" or "**docker** compose create")
It is not meant for handling multiple guilds as it was designed around one discord server in particular.

### OFFICIAL DOCUMENTATION

[Discord.js](https://discord.js.org/#/)

Plans to migrate the app to Docker Swarm mode
