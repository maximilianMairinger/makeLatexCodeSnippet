import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"
import sharp from "sharp"
import uidHash from "uid-safe"
import { promises as fs } from "fs"

function nowStr() {
  return new Date().toLocaleString("de-AT", { timeZone: "Europe/Vienna" })
}

function constrIncHash(prefix: string | (() => string), postfix: string | (() => string) = "", initCount = 0) {
  let uid = initCount
  return async function fileHash() {
    return (prefix instanceof Function ? prefix() : prefix) + await uidHash(32) + (uid++).toString(36) + (postfix instanceof Function ? postfix() : postfix)
  }
}

async function constrIncFileHash(path: string, filename: string | (() => string), postFix: string) {
  path = path.endsWith("/") ? path : path + "/"
  return constrIncHash((filename instanceof Function ? () => path + filename : path + filename), postFix, (await fs.readdir(path)).length)
}

(async () => {
  const tempHash = await constrIncFileHash("temp", "screenshot", ".png")
  const endHash = await constrIncFileHash("public/renders/", nowStr, ".png")

  
})()



const app = setup()

app.post("/echo", (req, res) => {
  res.send(req.body)
});

const defaultOptions = {
  lang: "js",
  theme: "light",
  numbers: false,
  autoFormat: true,
  resolutionFactor: 6
}

const render = async (source: string, options: {lang?: string, theme?: "dark" | "light", numbers?: boolean, autoFormat?: boolean, resolutionFactor?: number} = {}) => {
  options = merge(defaultOptions, options) as any

  console.log("starting");


  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  const activeElement = async () => await page.evaluateHandle(() => document.activeElement) as any
  const type = async (text: string, ms?: number) => await (await activeElement()).type(text, ms ? {delay: ms} : undefined)
  const openCmdPallet = async () => {
    await page.keyboard.down('ControlLeft')
    await page.keyboard.down('ShiftLeft')
    await page.keyboard.press('P')
    await page.keyboard.up('ShiftLeft')
    await page.keyboard.up("ControlLeft")
  }

  const linesOfSource = (() => {
    const matches = source.match("\n")
    if (matches === null) return 0
    else return matches.length
  })()

  await page.setViewport({
    width: 1920,
    height: 980 + (20 * linesOfSource),
    deviceScaleFactor: options.resolutionFactor
  });
  await page.goto('https://codesandbox.io/s/vanilla')

  await page.waitForSelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > textarea")
    
    
  await openCmdPallet()

  await delay(200)

  await type('new file')

  await delay(3500)

  await page.keyboard.press('Enter')

  await delay(1500)

  await type(source)



  if (options.autoFormat) {
    await page.keyboard.down('ControlLeft')
    await page.keyboard.press('S')
    await page.keyboard.up('ControlLeft')
  }
  else { 
    await openCmdPallet()
    await delay(200)
    await type("file: save without formatting")
    await delay(2000)
    await page.keyboard.press('Enter')  
  }
  


  await delay(500)

  type(`/code.${options.lang}`)

  await delay(500)
  
  await page.keyboard.press('Enter')
  
  await delay(1000)

  await openCmdPallet()

  await delay(200)

  if (options.theme.toLowerCase().includes("light")) {
    await type("preferences: color theme")
    await delay(1000)
    await page.keyboard.press('Enter')
    await delay(500)
    await type("atom one light")
    await delay(500)
    await page.keyboard.press('Enter')
  }

  await delay(4000)


  await page.evaluate((options) => {
    const linting = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background > div.view-overlays")
    if (linting) linting.remove()

    if (options.theme === "light") {
      const numbers = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement
      numbers.style.backgroundColor = "white"

      const mainTextBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background > div.view-lines") as HTMLElement
      mainTextBody.style.backgroundColor = "white"
    }
  }, options)

  await delay(500)

  await page.keyboard.down("ControlLeft")
  await page.keyboard.press("End")
  await page.keyboard.up("ControlLeft")

  await delay(500)

  await type("\n\n\n")

  await delay(500)

  await page.keyboard.down("ControlLeft")
  await page.keyboard.press("End")
  await page.keyboard.up("ControlLeft")

  await delay(500)

  const bounds = await page.evaluate((linesOfSource, numbers) => {
    const rect = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor").getBoundingClientRect()
    const lineBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background > div.view-lines")
    const lines = lineBody.querySelectorAll("span")

    let maxWidth = 0
    lines.forEach((line) => {
      if (maxWidth < line.offsetWidth) maxWidth = line.offsetWidth
    })

    let lineHeight = lines[0] ? lines[0].offsetHeight : 20

    const numbersWidth = numbers ? (document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement).offsetWidth : 0
    
    
    return { 
      top: rect.top,
      left: rect.left - numbersWidth,
      width: maxWidth + numbersWidth,
      height: linesOfSource * lineHeight
    }
  }, linesOfSource, options.numbers)

  console.log(bounds)




  await delay(3000)

  
  const tempFilename = await tempHash()

  await page.screenshot({path: `${tempFilename}.png`})
  browser.close()

  const endFilename = await endHash()

  await sharp(tempFilename).extract(bounds).toFile(endFilename)





  

  
  

  
  
}

render(`let me = "Hello!"; console.log(me)`, {autoFormat: false})




