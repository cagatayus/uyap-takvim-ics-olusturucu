// background.js - Prod v1.0

// Yedek enjeksiyon mekanizması (eğer content_scripts çalışmazsa)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("uyap.gov.tr")
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).catch(() => {
      // Zaten yüklüyse hata vermesi normal, sessizce devam et
    });
  }
});

let capturedDurusmaData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "UYAP_DATA_CAPTURED") {
    sendResponse({ status: "success", message: "Data received by background." });
    
    capturedDurusmaData = request.payload;
    chrome.runtime.sendMessage({ type: "UYAP_DATA_UPDATED", payload: capturedDurusmaData }).catch(() => {
      // Popup kapalıysa hata normal, sessizce devam et
    });
    
    return true;
  } else if (request.type === "GET_CAPTURED_DATA") {
    sendResponse({ data: capturedDurusmaData });
    return true; 
  }
});