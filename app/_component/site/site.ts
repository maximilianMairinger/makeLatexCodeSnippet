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
    
    const btn = document.createElement("button")
    btn.innerText = "Lets go"
    body.apd(btn);
    btn.on("click", async () => {
      
      console.log("sending: ", txt.value)
      let r = await post("renderPls", {
        source: txt.value
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
