document.querySelector("#open").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));
