const DEFAULT_API_BASE_URL = "http://localhost:3001/api";

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) {
        reject(new Error("无法读取当前标签页"));
        return;
      }
      resolve(tab);
    });
  });
}

async function createBookmark(apiBaseUrl) {
  const tab = await getActiveTab();
  const payload = {
    title: tab.title || "Untitled",
    url: tab.url,
    favicon: tab.favIconUrl || "",
    source: "browser_extension"
  };

  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/bookmarks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Ignore parse error and keep fallback message.
  }

  if (!response.ok) {
    const message = data?.message || "收藏失败";
    throw new Error(message);
  }

  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SAVE_CURRENT_TAB") {
    return false;
  }

  const apiBaseUrl = message.apiBaseUrl || DEFAULT_API_BASE_URL;
  createBookmark(apiBaseUrl)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
