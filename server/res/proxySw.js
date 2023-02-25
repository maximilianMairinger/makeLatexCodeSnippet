self.addEventListener('fetch', function(event) {
  if (event.request.method === 'GET' && !event.request.url.startsWith("chrome-extension://")) {


    let url = (() => {
      if (event.request.url.startsWith("http://") || event.request.url.startsWith("https://")) {
        if (event.request.url.startsWith("http://127.0.0.1") || event.request.url.startsWith("http://localhost")) {
          const p = new URL(event.request.url).pathname
          if (p !== "/") {
            return p
          }
          else return event.request.url
        }
        return `/${event.request.url}`
      }
    })()
    
    

    

    console.log("proxying",event.request.url, url)
    event.respondWith(
      fetch(url).then(function(response) {
        return response;
      })
    );
  }
})



