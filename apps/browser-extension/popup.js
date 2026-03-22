const DEFAULT_API_BASE_URL = "http://localhost:3001/api";
const STORAGE_KEY = "bookmark_api_base_url";

const apiInput = document.getElementById("apiBaseUrl");
const saveBtn = document.getElementById("saveBtn");
const statusText = document.getElementById("status");

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? "#fca5a5" : "#bfdbfe";
}

function getApiBaseUrlFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || DEFAULT_API_BASE_URL);
    });
  });
}

function setApiBaseUrlToStorage(value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: value }, () => resolve());
  });
}

function sendSaveRequest(apiBaseUrl) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "SAVE_CURRENT_TAB", apiBaseUrl },
      (response) => resolve(response)
    );
  });
}

async function init() {
  const savedApiBaseUrl = await getApiBaseUrlFromStorage();
  apiInput.value = savedApiBaseUrl;

  apiInput.addEventListener("change", async () => {
    const value = apiInput.value.trim() || DEFAULT_API_BASE_URL;
    await setApiBaseUrlToStorage(value);
    setStatus("API 地址已保存");
  });

  saveBtn.addEventListener("click", async () => {
    const apiBaseUrl = apiInput.value.trim() || DEFAULT_API_BASE_URL;
    await setApiBaseUrlToStorage(apiBaseUrl);

    saveBtn.disabled = true;
    setStatus("保存中...");

    try {
      const response = await sendSaveRequest(apiBaseUrl);
      if (!response?.ok) {
        throw new Error(response?.error || "未知错误");
      }
      setStatus("保存成功");
    } catch (error) {
      setStatus(`保存失败：${error.message}`, true);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

init();
