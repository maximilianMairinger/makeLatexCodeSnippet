import { Data } from "josm";
import Element from "./../component";



export default class LogDisplay extends Element {

  private empty = new Data(true)

  constructor() {
    super();


    const heading = this.q("h3")
    this.empty.get((empty) => {
      if (empty) heading.hide()
      else heading.show()
    })

    
  }

  log(e: string | Data<string>) {
    console.log("log", e)
    this.empty.set(false)
    const el = ce("log-line")
    el.txt(e)
    this.apd(el)
  }
  error(e: string | Data<string>) {
    console.error("error", e)
    this.empty.set(false)
    const el = ce("log-line")
    el.txt(e)
    el.classList.add("error")
    this.apd(el)
  }

  ask(question: string, {type = "text"}: {type?: "text" | "number" | "password" | "new-password"} = {}) {
    console.log("ask", question, type)
    this.empty.set(false)
    return new Promise((res) => {
      const el = ce("log-line")
      const questEl = ce("log-question")
      if (!(question.endsWith("?") || question.endsWith(":"))) question = question + ":"
      questEl.txt(question)
      el.apd(questEl)
      const inputEl = ce("input")
      inputEl.type = type
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          inputEl.disabled = true
          res(inputEl.value)
        }
      })
      el.apd(inputEl as any)
  
      this.apd(el)
    })
    
  }


  stl() {
    return require('./logDisplay.css').toString();
  }
  pug() {
    return require('./logDisplay.pug').default;
  }
}

window.customElements.define('c-log-display', LogDisplay);
