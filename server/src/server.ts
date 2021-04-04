import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"


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


  await delay(3000)

  await page.screenshot({path: 'tmp/screenshot.png'});


  await delay(30000)

  await browser.close();
  console.log("close")


  

  
  

  
  
}

render(`let me = "Hello!"; console.log(me)`, {autoFormat: false})

