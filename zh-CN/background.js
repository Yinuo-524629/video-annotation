const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "add-annotation") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "VA_START_ADD" }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => cleanup());
chrome.runtime.onStartup.addListener(() => cleanup());

async function cleanup() {
  const all = await chrome.storage.local.get(null);
  const now = Date.now();
  const remove = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith("video:")) continue;
    if (value?.exportedAt && now - value.exportedAt > KEEP_MS) {if(Array.isArray(value.fields))await chrome.storage.local.set({[key]:{fields:value.fields,records:[],exportedAt:null}});else remove.push(key);}
  }
  if (remove.length) await chrome.storage.local.remove(remove);
}
