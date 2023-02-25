import setup, { simpleExpessApp } from "./setup";
import detectPort from "detect-port"
import fss, { promises as fs } from "fs"
import mkdirp from "mkdirp"
import saniFileName from "sanitize-filename"
import path from "path"
import needle from "needle"
import { RequestHandler } from "express"
import { load } from "cheerio";
import josmFsAdapter from "josm-fs-adapter";
 
needle.defaults({ parse_response: false });


const localVsCode = "xcenicLocal"
const startUrl = "https://xcenic.com"










async function isUnknownRoute(route: string) {
  try {
    await fs.access(path.join(localVsCode, route))
    return false
  }
  catch (e) {
    return true
  }
}







async function addToApp(app: ReturnType<typeof simpleExpessApp>) {
  // proxy https://vscode.dev/ for every unknown route get it from vscode.dev, save it and send it back to the client. For every route that is already saved, send the local version of it.


  const mimeTypeIndex = await josmFsAdapter(path.join(__dirname, "../res/dist/mimeTypeIndex.json"), {})



  app.get(`/proxySw.js`, async (req, res, nxt) => {
    res.sendFile(path.join(__dirname, "../res/proxySw.js"))
  })






  app.get(`*`, async (req, res, nxt) => {
    let url = req.url.slice(1)
    const isRoot = url === ""
    if (isRoot) url = startUrl
    else {
      if (!(url.startsWith("https://") || url.startsWith("http://"))) {
        url = startUrl + "/" + url
      }
    }

    await mkdirp(localVsCode)

    const localRoute = url.split("/").map((e) => saniFileName(e)).join("$")
    const localPath = path.join(localVsCode, localRoute)

    const isUnknown = await isUnknownRoute(localRoute)
    
    if (isUnknown) {
      console.log(`Unknown route: "${localRoute}"`)

      try {
        
        let body: string
        try {
          let res = await needle("get", url, { 
            parse_response: false,
            headers: {
              "user-agent": req.headers["user-agent"]
            }
          })
          body = res.body
          const mime = res.headers["content-type"]
          console.log("mime", mime)
          mimeTypeIndex({[localRoute]: mime})

        }
        catch(e) {
          console.error("failed at fetching")
          console.error(e)
          return
        }
        
      
        console.log("done fetching", url)

        if (isRoot) {
          // inject the service worker script
          const $ = load(body)
          $("head").prepend(`<script>${await fs.readFile(path.join(__dirname, "../res/includeSw.js"), "utf-8")}</script>`)
          body = $.html()
        }
  

        try {
           // set mime type to res
          const mime = mimeTypeIndex()[localRoute]
          if (mime) {
            res.set("content-type", mime)
          }

          res.send(body)

          try {
            await fs.writeFile(localPath, body)
          }
          catch(e) {
            console.error("failed at saving")
            console.error(e)
            return
          }
        }
        catch(e) {
          console.error("failed at sending")
          console.error(e)
          return
        }
        
        
      }
      catch(e) {
        console.error(e)
        return
      }
      
    }
    else {
      console.log(`Known route: "${localRoute}"`)
      try {
        console.log(path.join(path.resolve(""), localVsCode, localRoute))
        // res.sendFile(path.join(path.resolve(""), localVsCode, localRoute))
        
        // set mime type to res
        const mime = mimeTypeIndex()[localRoute]
        if (mime) {
          res.set("content-type", mime)
        }
        res.send(await fs.readFile(path.join(path.resolve(""), localVsCode, localRoute)))
      }
      catch(e) {
        console.error(e)
        return
      }
      
      
    }
  })


  
  


  
}

export const port = detectPort(4000)

port.then((port) => {
  console.log(`VsCode server http://127.0.0.1:${port}/`)
})

addToApp(simpleExpessApp(port))



