// interceptor.js - Prod v1.0

if (window.__uyapInterceptorLoaded) {
  // Zaten yüklenmiş, tekrar yükleme
} else {
  window.__uyapInterceptorLoaded = true;
  
  (() => {
    // XHR interception
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener("load", function() {
        if (this.responseURL && this.responseURL.includes("avukat_durusma_sorgula_brd.ajx")) {
          try {
            let responseData;
            if (this.responseType === 'json' && typeof this.response === 'object' && this.response !== null) {
              responseData = this.response;
            } else if (this.responseText) {
              responseData = JSON.parse(this.responseText);
            } else {
              return;
            }

            window.postMessage({
              type: "FROM_INTERCEPTOR_JS_UYAP_DATA",
              payload: responseData
            }, window.location.origin);

          } catch (e) {
            // Hata durumunda sessizce devam et
          }
        }
      });
      return originalXHRSend.apply(this, args);
    };

    // Fetch interception
    const originalFetch = window.fetch;
    window.fetch = async (...fetchArgs) => {
      const [urlOrRequest] = fetchArgs;
      let urlString = '';

      if (typeof urlOrRequest === 'string') {
        urlString = urlOrRequest;
      } else if (urlOrRequest instanceof Request) {
        urlString = urlOrRequest.url;
      }

      const response = await originalFetch(...fetchArgs);

      if (urlString.includes("avukat_durusma_sorgula_brd.ajx")) {
        try {
          const clonedResponse = response.clone();
          const responseData = await clonedResponse.json();

          window.postMessage({
            type: "FROM_INTERCEPTOR_JS_UYAP_DATA",
            payload: responseData
          }, window.location.origin);

        } catch (e) {
          // Hata durumunda sessizce devam et
        }
      }
      
      return response;
    };
  })();
}