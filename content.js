// content.js - Prod v1.0

if (window.__uyapContentScriptLoaded) {
  // Zaten yüklenmiş, tekrar yükleme
} else {
  window.__uyapContentScriptLoaded = true;

  try {
    const scriptElement = document.createElement('script');
    scriptElement.src = chrome.runtime.getURL('interceptor.js');
    scriptElement.type = 'text/javascript';
    
    scriptElement.onerror = () => {
      // Hata durumunda sessizce devam et
    };
    
    (document.head || document.documentElement).appendChild(scriptElement);
    
  } catch (e) {
    // Hata durumunda sessizce devam et
  }

  // Sayfadan gelen mesajları dinle
  window.addEventListener("message", function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== "FROM_INTERCEPTOR_JS_UYAP_DATA") return;
    
    chrome.runtime.sendMessage({ 
      type: "UYAP_DATA_CAPTURED", 
      payload: event.data.payload 
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Hata durumunda sessizce devam et
      }
    });
  }, false);
}