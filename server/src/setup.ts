import express from "express"
import * as bodyParser from "body-parser"
import xrray from "xrray"; xrray(Array);
import * as MongoDB from "mongodb";
const MongoClient = MongoDB.MongoClient
import pth from "path"
import fs from "fs"
import detectPort from "detect-port"
import expressWs from "express-ws"
import { WsAttachment } from "./wsUtil";




const defaultPortStart = 3050

export type SendFileProxyFunc = (file: string, ext: string, fileName: string) => string | void | null

export function simpleExpessApp(port?: number | Promise<number>) {
  let app = express()
  app.use(bodyParser.urlencoded({extended: false}))
  app.use(bodyParser.json())
  if (port) {
    if (port instanceof Promise) {
      port.then(app.listen.bind(app))
    }
    else app.listen(port)
  }
  return app
}



export function configureExpressApp(indexUrl: string, publicPath: string, sendFileProxy?: Promise<SendFileProxyFunc> | SendFileProxyFunc, middleware?: (app: express.Express) => express.Express | void, poort?: number): express.Express & { port: Promise<number> } {
  if (indexUrl !== "*") if (!indexUrl.startsWith("/")) indexUrl = "/" + indexUrl

  let app = express()
  if (middleware) {
    let q = middleware(app)
    if (q !== undefined && q !== null) app = q as any
  }
  app.use(bodyParser.urlencoded({extended: false}))
  app.use(bodyParser.json())


  let sendFileProxyLoaded: Function =  (res: any) => (path: string) => {
    res.old_sendFile(pth.join(pth.resolve(""), path))
  }
  if (sendFileProxy) {
    (async () => {
      let proxy = await sendFileProxy
      sendFileProxyLoaded = (res: any) => (path: string) => {
        let file = fs.readFileSync(path).toString()
        let extName = pth.extname(path)
        let end = proxy(file, pth.extname(path), pth.basename(path, extName))
        if (end === undefined) res.send(file)
        else if (end === null) res.status(400).end()
        else res.send(end)
      }
    })()
  }

  //@ts-ignore
  app.old_get = app.get
  //@ts-ignore
  app.get = (url: string, cb: (req: any, res: any, next) => void) => {

    //@ts-ignore
    app.old_get(url, (req, res, next) => {
      res.old_sendFile = res.sendFile
      res.sendFile = sendFileProxyLoaded(res)
      cb(req, res, next)
    })
  }

  let prt = process.env.port
  let port: Promise<number>
  if (prt === undefined) {
    port = (detectPort(defaultPortStart) as Promise<number>).then((port) => {console.log("No port given, using fallback - Serving on http://127.0.0.1:" + port)}) as Promise<number>
  }
  else port = Promise.resolve(+prt)

  //@ts-ignore
  app.port = port

  
  app.use(express.static(pth.join(pth.resolve(""), publicPath)))
  
  app.get(indexUrl, (req, res) => {
    res.sendFile("public/index.html")
  })
  

  

  port.then(app.listen.bind(app))


  return app as any
}

type DBConfig = {
  url: string,
  dbName: string
}


const publicPath = "./public"


export default function setup(options: {dbName_DBConfig: string | DBConfig, indexUrl?: string, webSockets: true}): Promise<{ db: MongoDB.Db, app: express.Express & WsAttachment }>;
export default function setup(options: {dbName_DBConfig?: undefined | null, indexUrl?: string, webSockets: true}): express.Express & { port: Promise<number> } & WsAttachment;
export default function setup(options: {dbName_DBConfig: string | DBConfig, indexUrl?: string, webSockets?: false}): Promise<{ db: MongoDB.Db, app: express.Express & { port: Promise<number> } }>;
export default function setup(options?: {dbName_DBConfig?: undefined | null, indexUrl?: string, webSockets?: false}): express.Express & { port: Promise<number> };
export default function setup({dbName_DBConfig, indexUrl = "/", webSockets = false}: {dbName_DBConfig?: string | DBConfig, indexUrl?: string, webSockets?: boolean} = {}): any {
  const app = !webSockets ? configureExpressApp(indexUrl, publicPath) : configureExpressApp(indexUrl, publicPath, undefined, (app) => {
    expressWs(app)
  })


  if (dbName_DBConfig) {
    let dbConfig: DBConfig
    if (typeof dbName_DBConfig === "string") dbConfig = { dbName: dbName_DBConfig, url: "mongodb://localhost:27017"}
    else dbConfig = dbName_DBConfig

    return new Promise((res) => {
      MongoClient.connect(dbConfig.url, { useUnifiedTopology: true }).then((client) => {
        let db = client.db(dbConfig.dbName)
        res({db, app})
      }).catch(() => {
        console.error("Unable to connect to MongoDB")

        res({app})
      })
    })
  }
  else return app
}
