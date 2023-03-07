// Patches all the missing keys in the db.json file with default values

const fs = require("fs");
const path = require("path");
const { fillMissing, version } = require("object-fill-missing-keys");

console.warn(version);

const defaultData = {
	userID: -1,
	userMeta: {
		iconURL: "./favicon.ico",
		username: "Unknown Member",
	},
	score: 0,
	scoreAfterMidnight: 0,
	day: 1,
	month: 1,
};

const dbFilePath = path.join(__dirname, "db.json");
let parsedData = JSON.parse(fs.readFileSync(dbFilePath));

parsedData.forEach((element) => {
	// enforces the defaultData key-set
	element.user = fillMissing(element.user, defaultData, {
		useNullAsExplicitFalse: false,
	});
});

fs.writeFileSync(dbFilePath, JSON.stringify(parsedData, null, 2));
