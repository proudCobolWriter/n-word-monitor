// Dependencies

const { lookup } = require("geoip-lite");
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const bot = require("../");

// CONSTANTS

const RETRY_INTERVAL = 3; // in case retrieving wallpapers fails
const PIXABAY_API_URL = "https://pixabay.com/api/videos/";
const MAXIMUM_LEADERBOARD_RESULTS = 3; // 50;

// Prototype extensions

String.prototype.format = function () {
	let a = this;
	for (const k in arguments) {
		a = a.replace("{" + k + "}", arguments[k]);
	}
	return a;
};

Array.prototype.random = function () {
	return this[Math.floor(Math.random() * this.length)];
};

// Arrays

let wallpapers = [];

// Setting up the very primitive http server

const app = express();

app.get("/", (request, response) => {
	let baseHTML;

	try {
		const guildIcon = bot.getGuildIconURL();
		const [botData, botLang] = [bot.getData(), bot.getLang()];

		if (
			!botData ||
			botData.length == 0 ||
			!botLang ||
			botLang.length == 0
		) {
			throw "No data or no lang loaded";
		}

		let data = JSON.parse(JSON.stringify(botData));

		data.forEach((element) => {
			for (const [key] of Object.entries(element.user)) {
				if (key != "userID" && key != "score" && key != "userMeta") {
					delete element.user[key];
				}
			}
		});

		let newData = [...(data || [])].sort((a, b) => {
			if (!a.user) return 1;
			if (!b.user) return -1;
			return (
				(b.user.score != undefined ? b.user.score : 0) -
				(a.user.score != undefined ? a.user.score : 0)
			);
		}); // returns the sorted array

		if (newData.length > MAXIMUM_LEADERBOARD_RESULTS)
			newData.length = MAXIMUM_LEADERBOARD_RESULTS;

		baseHTML = fs.readFileSync(
			path.join(__dirname, "shared", "page.html"),
			"utf8"
		);
		baseHTML = baseHTML.format(
			JSON.stringify(wallpapers.random()),
			JSON.stringify(newData),
			guildIcon,
			...botLang["panel_l"]
		);

		if (baseHTML && wallpapers.length > 0) {
			response.setHeader("Content-Type", "text/html");
			response.send(baseHTML);

			const ip =
				request.headers["x-forwarded-for"] ||
				request.connection.remoteAddress;

			const userRegion = lookup(ip);

			console.log(
				`✨ Successfuly sent back HTML (user region: ${
					!userRegion ? "unknown" : userRegion.country
				})`
			);

			return;
		}

		response
			.send(
				"No wallpapers found, refresh the page or contact the administrator"
			)
			.status(500);

		console.log(
			"Someone attempted to access the control panel without the wallpapers being loaded!"
		);
	} catch (error) {
		response.send("Internal Server Error").status(500);

		console.error(error);
	}
});

app.use("/", express.static(path.join(__dirname, "shared")));
app.listen(parseInt(process.env.HOST_PORT), () => {
	console.log(
		`⚡ Server is running on ${process.env.HOST_URL}:${process.env.HOST_PORT}`
	);
}).on("error", (error) => {
	console.error(
		`Webserver has encountered an error while loading : ${error}`
	);
});

// Exported function(s)

const retrievePopularWallpapers = function () {
	axios
		.get(PIXABAY_API_URL, {
			params: {
				key: process.env.PIXABAY_API_KEY,
				q: "motion loop".replace(/ /g, "+"),
				per_page: 50,
				safesearch: true,
				min_width: 1280,
				min_height: 720,
				video_type: "animation",
			},
		})
		.then((response) => {
			console.log(`Retrieved ${response.data.hits.length} wallpapers!`);

			for (const [, value] of Object.entries(response.data.hits)) {
				if (
					[
						48501, 48503, 45959, 6467, 6470, 27433,
						12530 /* List of ignored wallpapers */,
					].some((x) => x === value.id)
				)
					continue;
				if (
					value.tags.includes("love") ||
					value.tags.includes("hearts")
				)
					continue;
				wallpapers.push(value.videos);
			}
		})
		.catch((error) => {
			console.error(
				`Error occurred whilst retrieving wallpapers, retrying in ${RETRY_INTERVAL} seconds:\n` +
					error.message
			);

			setTimeout(() => {
				retrievePopularWallpapers();
			}, RETRY_INTERVAL * 1000);
		});
};

exports.init = retrievePopularWallpapers;
