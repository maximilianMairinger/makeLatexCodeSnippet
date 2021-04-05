import Component from "../component"
import declareComponent from "../../lib/declareComponent"

import ajaon from "ajaon"
import edom from "extended-dom"
import download from "downloadar"

const { post, get } = ajaon();

export default class Site extends Component {

  constructor() {
    super()
    
    


    const body = this.q("bod-bod")
    this.apd(body)
    
    const txt = document.createElement("textarea")
    txt.value = localStorage.val
    txt.css({width: 600, height: 400})
    txt.on("input", () => {
      localStorage.val = txt.value
    })
    body.apd(txt, document.createElement("br"));

    const resolution = document.createElement("input")
    resolution.placeholder = "Resolution Factor"
    resolution.inputMode = "numeric"
    resolution.type = "number"
    body.apd(resolution as any)

    const lang = document.createElement("input")
    lang.value = "js"
    lang.placeholder = "Language extension"
    lang.type = "text"

    body.apd(lang as any)


    const numbers = document.createElement("input")
    const numbersLabel = document.createElement("label")
    numbers.id = numbers.name = numbersLabel.htmlFor = "numbers"
    numbersLabel.innerText = "Numbers"
    numbers.type = "checkbox"
    body.apd(numbers as any, numbersLabel)

    const format = document.createElement("input")
    const formatLabel = document.createElement("label")
    format.id = format.name = formatLabel.htmlFor = "format"
    formatLabel.innerText = "Format"
    format.type = "checkbox"
    body.apd(format as any, formatLabel)

    
    const btn = document.createElement("button")
    btn.innerText = "Lets go"
    body.apd(btn);
    btn.on("click", async () => {
      
      console.log("sending: ", txt.value)
      let r = await post("renderPls", {
        source: txt.value,
        options: {
          resolutionFactor: (resolution.value !== "" && !isNaN(+resolution.value)) ? +resolution.value : undefined,
          numbers: numbers.checked,
          lang: lang.value,
          autoFormat: format.checked
        }
      }) as {id: string}
      download("http://" + location.host + "/renders/" + r.id)
      console.log("fileId", "http://" + location.host + "/renders/" + r.id)
    })
    

  }

  stl() {
    return require("./site.css")
  }
  pug() {
    return require("./site.pug")
  }
}

declareComponent("site", Site)
