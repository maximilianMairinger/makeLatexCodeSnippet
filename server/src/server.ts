import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"
import sharp from "sharp"
import uidHash from "uid-safe"
import { promises as fs } from "fs"
import slugify from "slugify"
import slash from "slash"

/** Function that count occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
 function occurrences(string, subString, allowOverlapping) {

  string += "";
  subString += "";
  if (subString.length <= 0) return (string.length + 1);

  var n = 0,
      pos = 0,
      step = allowOverlapping ? 1 : subString.length;

  while (true) {
      pos = string.indexOf(subString, pos);
      if (pos >= 0) {
          ++n;
          pos += step;
      } else break;
  }
  return n;
}

function nowStr() {
  return new Date().toLocaleString("de-AT", { timeZone: "Europe/Vienna" })
}

function slugPath(path) {
  return slash(path).split("/").map((s) => slugify(s)).join("/")
}

function constrIncHash(prefix: string | (() => string), postfix: string | (() => string) = "", initCount = 0) {
  let uid = initCount
  return async function fileHash() {
    return (prefix instanceof Function ? slugPath(prefix()) : slugPath(prefix)) + await uidHash(32) + (uid++).toString(36) + (postfix instanceof Function ? slugPath(postfix()) : slugPath(postfix))
  }
}

async function constrIncFileHash(path: string, filename: string | (() => string), postFix: string) {
  path = path.endsWith("/") ? path : path + "/"
  return constrIncHash((filename instanceof Function ? () => path + filename() : path + filename), postFix, (await fs.readdir(path)).length)
}


const app = setup()

app.post("/echo", (req, res) => {
  res.send(req.body)
});



(async () => {
  const tempHash = await constrIncFileHash("tmp", "screenshot_", ".png")
  const endHash = await constrIncFileHash("public/renders/", "", ".png")

  

  const defaultOptions = {
    lang: "js",
    theme: "light",
    numbers: false,
    autoFormat: true,
    resolutionFactor: 6
  }

  const render = async (source: string, options: {lang?: string, theme?: "dark" | "light", numbers?: boolean, autoFormat?: boolean, resolutionFactor?: number} = {}) => {
    console.log("render request at ", nowStr())
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

    const linesOfSource = occurrences(source, "\n", false) + 1


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

    

    if (options.theme.toLowerCase().includes("light")) {
      await openCmdPallet()
      await delay(200)
      await type("preferences: color theme")
      await delay(1000)
      await page.keyboard.press('Enter')
      await delay(500)
      await type("atom one light")
      await delay(500)
      await page.keyboard.press('Enter')
    }

    await delay(2000)

    await openCmdPallet()

    await delay(200)
    await type("toggle word wrap")
    await delay(1000)
    await page.keyboard.press('Enter')
    await delay(500)




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
      const lineBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background > div.view-lines")
      const rect = lineBody.getBoundingClientRect()
      const lines = lineBody.querySelectorAll("div > span") as NodeListOf<HTMLElement>

      let maxWidth = 0
      lines.forEach((line) => {
        if (maxWidth < line.offsetWidth) maxWidth = line.offsetWidth
      })

      const firstLine = lineBody.querySelector("div")

      let lineHeight = firstLine ? firstLine.offsetHeight : 20

      const numbersWidth = numbers ? (document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement).offsetWidth : 0
      
      
      
      return { 
        top: rect.top,
        left: rect.left - numbersWidth,
        width: maxWidth + numbersWidth,
        height: linesOfSource * lineHeight
      }
    }, linesOfSource, options.numbers)

    console.log(bounds)

    for (let k in bounds) {
      bounds[k] = bounds[k] * options.resolutionFactor
    }




    await delay(3000)

    
    const tempFilename = await tempHash()

    await page.screenshot({path: tempFilename})
    browser.close()

    const endFilename = await endHash()

    console.log("cropping image", tempFilename)
    await sharp(tempFilename).extract(bounds).toFile(endFilename)
    


    console.log("done cropping image")

    

    

    
    

    
    
  }

  render(`let me = "Hello!"; console.log(me)\n//was soll das\nimport abc from "./abc"\nconsole.log(abc())`, {autoFormat: false, numbers: false})
})()








