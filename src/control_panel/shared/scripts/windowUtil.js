/* eslint-disable no-undef */
window.waitForElement = (selector) => {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
};

window.tiemoutSync = (secs) =>
	new Promise((res) => setTimeout(res, secs * 1000));

window.onloadSync = (img) => {
	new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = reject;
	});
};
