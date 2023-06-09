/* eslint-disable no-undef */
const video = document.querySelector(".background-container video");

Object.assign(video.style, {
	opacity: 0,
});

const wallpaperData = document.querySelector("#wallpapers-storage").innerText;
const parsedWallpaperData = JSON.parse(wallpaperData);

const keys = Object.keys(parsedWallpaperData);

let chosenSize;
for (let i = 1; i < keys.length; i++) {
	let value = parsedWallpaperData[keys[i]];

	if (value.width <= 1920) {
		if (!chosenSize) {
			chosenSize = value;
		} else if (chosenSize.width < value.width) {
			chosenSize = value;
		}
	}
}

if (chosenSize) {
	const videoSource = document.createElement("source");
	videoSource.setAttribute("src", chosenSize.url);
	videoSource.setAttribute("type", "video/mp4");

	video.appendChild(videoSource);

	video.addEventListener("loadeddata", () => {
		video.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 0.5e3,
			iterations: 1,
			fill: "forwards",
		});
	});

	videoSource.addEventListener("error", () => {
		setTimeout(() => {
			video.appendChild(videoSource);
			console.warn("Video failed to load! Retrying in 1 second");
		}, 1e3); // retry after 1 second if the loading failed
	});
}
