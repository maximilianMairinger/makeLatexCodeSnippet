import Component from "../component"
import declareComponent from "../../lib/declareComponent"

import ajaon from "ajaon"
import edom from "extended-dom"
import download from "downloadar"
import input from "./../input/input"
import Button from "./../_button/_rippleButton/blockButton/blockButton"
import copy from "copy-to-clipboard"
import LogDisplay from "./../logDisplay/logDisplay"
import { bindInstanceFuncs, functionBasedWsClient, functionBasedWsServer } from "../../../server/src/wsUtil"
import { ExportedFunctions as ExportedServerFunctions } from "../../../server/src/server"



const { post, get } = ajaon();


const pxToPt = (() => {
  const fac = 12 / 16
  return function pxToPt(px: number) {
    return px * fac
  }
})()





export default class Site extends Component {

  constructor() {
    super()
    
    


    const body = this.q("bod-bod")
    this.apd(body)
    
    const txt = document.createElement("textarea")
    if (localStorage.val !== undefined) txt.value = localStorage.val
    txt.css({width: 600, height: 400})
    txt.on("input", () => {
      localStorage.val = txt.value
    })
    body.apd(txt);

    const settingsBod = document.createElement("settings-body")
    body.apd(settingsBod)

    const name = input("Name")
    settingsBod.apd(name)


    const resolution = input("Resolution Factor", "integer", undefined, 3)
    settingsBod.apd(resolution)

    const lang = input("Language extension", undefined, undefined, "js")
    settingsBod.apd(lang)

    const numbersBody = ce("numbers-body")
    const numbers = document.createElement("input")
    const numbersLabel = document.createElement("label")
    numbers.id = numbers.name = numbersLabel.htmlFor = "numbers"
    numbersLabel.innerText = "Numbers"
    numbers.type = "checkbox"
    settingsBod.apd(numbersBody)
    numbersBody.apd(numbers as any, numbersLabel)
    numbers.checked = true


    const formatBody = ce("format-body")
    const format = document.createElement("input")
    const formatLabel = document.createElement("label")
    format.id = format.name = formatLabel.htmlFor = "format"
    formatLabel.innerText = "Format"
    format.type = "checkbox"
    settingsBod.apd(formatBody)
    formatBody.apd(format as any, formatLabel)
    format.checked = true

    const themeBody = ce("format-body")
    const theme = document.createElement("select")
    theme.id = theme.name = "theme";
    theme.options.add(new Option("Light (Pure)", "light-pure"))
    theme.options.add(new Option("Light (Offwhite)", "light-offwhite"))
    theme.options.add(new Option("Dark", "dark"))
    theme.value = "light-pure"
    settingsBod.apd(themeBody)
    themeBody.apd(theme as any)

    

    let lastId: any
    let curNameValue: string
    const btnContainer = ce("btn-container")
    const btn = new Button("Lets go", async () => {

      const id = await server.renderPls(txt.value, {
        resolutionFactor: (resolution.value() !== "" && !isNaN(+resolution.value())) ? +resolution.value() : undefined,
        numbers: numbers.checked,
        lang: lang.value(),
        autoFormat: format.checked,
        theme: theme.value as "dark" | "light-pure" | "light-offwhite"
      })

      result.style.display = "block"
      copyBtn.style.display = "block"

      curNameValue = name.value() || id

      const lines = txt.value.split("\n").length

      result.value = `\\begin{listing}
  \\includegraphics[height=${pxToPt(17) * lines}pt]{images/code/${curNameValue}.png}
  \\caption{Dummy_Caption}
  \\label{code:${curNameValue}}
\\end{listing}`
    })
    btnContainer.apd(btn)
    settingsBod.apd(btnContainer, document.createElement("br"));




    const startDownload = () => {
      if (!lastId) return
      console.log("http://" + location.host + "/renders/" + lastId + ".png")
      download("http://" + location.host + "/renders/" + lastId + ".png", curNameValue)
      lastId = undefined
    }

    const result = document.createElement("textarea")
    result.contentEditable = "false"
    result.id = "result"
    result.style.display = "none"
    result.on("click", startDownload)
    settingsBod.apd(result);



    const copyBtn = new Button("Copy", startDownload)
    copyBtn.style.display = "none"
    settingsBod.apd(copyBtn);
    copyBtn.addActivationCallback(() => {
      copy(result.value)
    })


    
    body.apd(logDisplay)
    


  }

  stl() {
    return require("./../input/input.css").toString() + require("./site.css").toString()
  }
  pug() {
    return require("./site.pug")
  }
}

declareComponent("site", Site)




const logDisplay = new LogDisplay()
const ws = new WebSocket("ws://127.0.0.1:6500/ws")
export const webLog = functionBasedWsServer(ws as any, bindInstanceFuncs(logDisplay, ["log", "error", "ask"]))

const server = functionBasedWsClient<ExportedServerFunctions>(ws as any)



