// Hello fellow reader
/* eslint-disable no-undef */

/*

addEventListener("mousemove", (event) => {
	const e = document.querySelectorAll(".leaderboard-element");
	if (!e) return;

    const [x, y] = [(event.clientX - window.innerWidth / 2) / (window.innerWidth / 2), (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2)];

	e.forEach((element) => {
		Object.assign(element.style, {
		["box-shadow"]: `${2.5 * x}px ${4.5 * y}px 10px rgba(255, 255, 255, 0.4)`
	});
});

*/

const itemRowText = document.querySelector("#item-text").innerText;
const userData = document.querySelector("#leaderboard-storage").innerText;
const parsedUserData = JSON.parse(userData);

if (parsedUserData && parsedUserData.length >= 3) {
	waitForElement("#menu1").then(async (element) => {
		for (let k = 1; k <= 3; k++) {
			const frag = document.createDocumentFragment();
			const thisUserData = parsedUserData[k - 1].user;

			const newElement = document.createElement("div");
			newElement.setAttribute("class", "leaderboard-element");
			newElement.setAttribute("id", "leaderboard-" + k);
			frag.appendChild(newElement);

			const imageElement = document.createElement("img");

			await onloadSync(imageElement);

			imageElement.setAttribute("src", thisUserData.userMeta.iconURL);
			imageElement.setAttribute("class", "non-draggable");
			newElement.appendChild(imageElement);

			const numberElement = document.createElement("h1");
			const hashtagElement = document.createElement("span");

			hashtagElement.innerText = "#";
			hashtagElement.setAttribute(
				"class",
				"leaderboard-place anton-font"
			);
			numberElement.appendChild(hashtagElement);

			numberElement.append(k);
			numberElement.setAttribute(
				"class",
				"leaderboard-place anton-font italic"
			);

			const divElement = document.createElement("div");

			newElement.appendChild(numberElement);
			newElement.appendChild(divElement);

			const text1 = document.createElement("p");
			const text2 = document.createElement("p");

			text1.innerHTML = `${thisUserData.userMeta.username}${
				["👑", "🥈", "🥉"][k - 1]
			}`;
			text2.innerHTML = `${itemRowText.split("|")[0]}${
				thisUserData.score
			}${itemRowText.split("|")[1]}`;
			text1.setAttribute("class", "anton-font italic");
			text1.setAttribute("title", thisUserData.userID);
			text2.setAttribute("class", "anton-font");

			divElement.appendChild(text1);
			divElement.appendChild(text2);

			Object.assign(newElement.style, {
				opacity: 0,
			});

			await tiemoutSync(0.5);

			newElement.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: 0.75e3,
				iterations: 1,
				fill: "forwards",
			});

			element.appendChild(frag);
		}
	});
}
