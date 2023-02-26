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


export type FunctionMapWithPromisesAsReturnType<FunctionMap extends {[key in string]: (...a: unknown[]) => unknown}> = {
  [key in keyof FunctionMap]: (...a: Parameters<FunctionMap[key]>) => ReturnType<FunctionMap[key]> extends Promise<any> ? ReturnType<FunctionMap[key]> : Promise<ReturnType<FunctionMap[key]>>
}


export function functionBasedWsServer<FunctionMap extends {[key in string]: (...a: unknown[]) => unknown}>(ws_url: WebSocket | string, functions: FunctionMap) {
  const ws = (typeof ws_url === "string" ? new WebSocket(normalizeWsUrlProtocol(ws_url)) : ws_url) as any as WebSocket
  ws.on("message", (data) => {
    const { c, id } = parse(typeof data === "string" ? data : data.data)
    if (c !== undefined) {
      for (let key in c) {
        const func = functions[key]
        if (func) {
          (async () => {
            const result = await func(...c[key])
            ws.send(stringify({r: {[id]: result}}))
          })()
        }
      }
    }
  })
  return functions as FunctionMapWithPromisesAsReturnType<FunctionMap>
}

export function functionBasedWsClient<FunctionMap extends {[key in string]: (...a: unknown[]) => unknown}>(ws: WebSocket | Promise<WebSocket>) {
  const returnMap = new Map<number, Function>()
  let id = 0

  if (ws instanceof Promise) ws.then(go)
  else go(ws)
  

  function go(ws: WebSocket) {
    ws.on("message", (data) => {
      const { r } = parse(typeof data === "string" ? data : data.data)
      if (r !== undefined) {
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
          const myId = id++
          returnMap.set(myId, res);
          (await ws).send(stringify({id: myId, c: {[prop]: args}}))
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



