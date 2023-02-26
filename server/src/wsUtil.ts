import { stringify, parse } from "circ-json"

export type WsOnFunc = (eventType: "open" | "close" | "message" | "error", cb: (data: any) => void) => void  
export type WsSendFunc = (data: any) => void
export type WebSocket = {on: WsOnFunc, send: WsSendFunc}
export type WsAttachment = { ws: ((path: string, cb: (ws: {on: WsOnFunc, send: WsSendFunc}) => void) => void) }



function normalizeWsUrlProtocol(url: string) {
  
  if (url.startsWith("ws://")) return url
  else if (url.startsWith("wss://")) return url
  else if (url.startsWith("http://")) return "ws://" + url.slice(7)
  else if (url.startsWith("https://")) return "wss://" + url.slice(8)
  else {
    if (!url.startsWith("/")) url = "/" + url
    try {
      return normalizeWsUrlProtocol(`${location.origin}${url}`)
    }
    catch(e) {
      throw new Error("Please provide a valid fully qualified url (starting with wss://). Got: " + url)
    }
    
  }


}


export function functionBasedWsServer<FunctionMap extends {[key in string]: (...a: unknown[]) => unknown}>(ws_url: WebSocket | string, functions: FunctionMap) {
  const ws = (typeof ws_url === "string" ? new WebSocket(normalizeWsUrlProtocol(ws_url)) : ws_url) as any as WebSocket
  ws.on("message", ({data: msg}) => {
    const { c } = parse(msg)
    if (c) {
      for (let key in c) {
        const func = functions[key]
        if (func) {
          const result = func(...c[key])
          console.log("sending", result)
          ws.send(stringify({r: {[key]: result}}))
        }
      }
    }
  })
  return functions
}

export function functionBasedWsClient<FunctionMap extends {[key in string]: (...a: unknown[]) => unknown}>(ws: WebSocket | Promise<WebSocket>) {
  const returnMap = new Map<number, Function>()
  let id = 0

  if (ws instanceof Promise) ws.then(go)
  else go(ws)
  

  function go(ws: WebSocket) {
    ws.on("message", ({data: msg}) => {
      const { r } = parse(msg)
      if (r) {
        for (const key in r) {
          const ret = returnMap.get(+key)
          if (ret === undefined) {
            console.error("Unexpected return id")
            return
          } 
          ret(r[key])
          returnMap.delete(+key)
        }
      }
    })
  }

  return new Proxy({}, {
    get(target, prop: string) {
      return (...args: unknown[]) => {
        return new Promise(async (res) => {
          returnMap.set(id++, res);
          console.log("sending", args);
          (await ws).send(stringify({c: {[prop]: args}}))
        })
      }
    }
  }) as FunctionMap
  
}

export function bindInstanceFuncs<Instance extends object, Subset extends (keyof Instance)[] & string[]>(instance: Instance, subset?: Subset) {
  if (subset === undefined) subset = Object.keys(instance.constructor.prototype) as any 
  const ob = {} as any
  for (const key of subset) {
    if (instance[key] instanceof Function) ob[key] = (instance[key] as any).bind(instance)
    else console.error("Key " + key + " is not a function")
  }
  return ob as Pick<Instance, Subset[number]>
}



