(async() => {
  if ("serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      console.log("[SW] Found Service worker")
    } else {
      await navigator.serviceWorker.register("./proxySw.js", {scope: "./"}).then(function(reg){
        console.log("[SW] Service worker installed with scope: " + reg.scope)
      })
    }
  }
  else {
    console.warn("[SW] Unable to install Service worker. Not supported.");
  }
})()