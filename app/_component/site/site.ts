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

    const resoltion = document.createElement("input")
    resoltion.placeholder = "Resolution Factor"
    resoltion.inputMode = "numeric"
    resoltion.type = "number"
    body.apd(resoltion as any)

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
          resoltion: (resoltion.value !== "" && !isNaN(+resoltion.value)) ? +resoltion.value : undefined,
          numbers: numbers.checked,
          lang: lang.value,
          autoFormat: format.value
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
