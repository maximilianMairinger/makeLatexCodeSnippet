import ajaon from "ajaon"
import edom from "extended-dom"
import download from "downloadar"



document.body.css("background", "black")

let { post, get } = ajaon();

const txt = document.createElement("textarea")
txt.value = localStorage.val
txt.css({width: 600, height: 400})
txt.on("input", () => {
  localStorage.val = txt.value
})
document.body.apd(txt);
const btn = document.createElement("button")
btn.innerText = "Lets go"
document.body.apd(btn);
btn.on("click", async () => {
  
  console.log("sending: ", txt.value)
  let r = await post("renderPls", {
    source: txt.value
  }) as {id: string}
  download("http://" + location.host + "/renders/" + r.id)
  console.log("fileId", "http://" + location.host + "/renders/" + r.id)
})
