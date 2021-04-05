import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"
import sharp from "sharp"
import uidHash from "uid-safe"
import { promises as fs } from "fs"
import slugify from "slugify"
import slash from "slash"
import clip from "clipboardy"


const editorConfig = {
  "editor.formatOnSave": false,
  "editor.fontSize": 20,
  "editor.tabSize": 2,
  "editor.minimap.enabled": false,
  "workbench.editor.openSideBySideDirection": "down",
  "svelte.plugin.typescript.diagnostics.enable": false,
  "javascript.autoClosingTags": false,
  "typescript.autoClosingTags": false,
  "typescript.tsserver.useSeparateSyntaxServer": false,
  "workbench.colorTheme": "Atom One Dark",
  "html.autoClosingTags": false,
  "typescript.locale": "en",
  "editor.wrappingIndent": "none",
  "editor.autoIndent": false,
  "editor.quickSuggestions": false,
  "editor.autoClosingBrackets": false,
  "editor.formatOnType": false,
  "editor.acceptSuggestionOnEnter": "off",
  "editor.wordWrap": "on"
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





(async () => {
  const app = setup()

  const inRender = new Map()

  app.post("/renderPls", async (req, res) => {
    const r = await render(req.body.source, req.body.options)
    res.send({id: r.id})
    inRender.set(r.id, r.done)
    r.done.then(() => {
      inRender.delete(r.id)
    })
  });

  app.get("/renders/:id", (req, res, continue_) => {
    const renderDone = inRender.get(req.params.id)
    if (renderDone !== undefined) {
      renderDone.then(() => {
        res.sendFile(`public/renders/${req.params.id}`)
      })
    }
    else res.send({err: "Invalid id"})
  })







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
    const [ tempFilename, endFilename ] = await Promise.all([tempHash(), endHash()])
    console.log("render request at ", nowStr(), "filename: ", endFilename, "source: \n", source)



    const done = (async () => {
      options = merge(defaultOptions, options) as any


      const browser = await puppeteer.launch({ headless: true })
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

      const openSettings = async () => {
        await page.keyboard.down('ControlLeft')
        await page.keyboard.press("Comma")
        await page.keyboard.up("ControlLeft")
        await delay(1500)
      }

      const paste = async (text: string) => {
        const before = await clip.read()
        await clip.write(text)
        await page.keyboard.down('Control');
        await page.keyboard.down('Shift');
        await page.keyboard.press('KeyV');
        await page.keyboard.up('Control');
        await page.keyboard.up('Shift');
        await clip.write(before)
      }

      const save = async () => {
        await page.keyboard.down('ControlLeft')
        await page.keyboard.press('S')
        await page.keyboard.up('ControlLeft')
      }


  
      
      const linesOfSource = source.split("\n").length
  
  
      await page.setViewport({
        width: 1920,
        height: 980 + (20 * linesOfSource),
        deviceScaleFactor: options.resolutionFactor
      });
      await page.goto('https://codesandbox.io/s/vanilla')
  
      await page.waitForSelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > textarea")

      await delay(3000)


      if (options.theme.toLowerCase().includes("light")) {
        editorConfig["workbench.colorTheme"] = "Atom One Light"
      }



      await openSettings()
      page.evaluate(() => {
        (document.querySelector("#vscode-editor > div > div > div > div > div > div.split-view-container > div > div > div.title.tabs.show-file-icons > div.tabs-and-actions-container > div.editor-actions > div > div > ul > li:nth-child(1) > a") as HTMLElement).click()
      })
      await delay(2500)
      await page.keyboard.down('ControlLeft')
      await page.keyboard.press('A')
      await page.keyboard.up('ControlLeft')
      await page.keyboard.press("Backspace")
      await delay(100)
      await paste(JSON.stringify(editorConfig))
      await save()
      await delay(500)
      await openSettings()
      await paste("Editor: Drag and drop")
      await delay(1000)
      await page.keyboard.press("ArrowDown")
      await delay(1000)
      await page.keyboard.press("Enter")
      await delay(3000)


      await openCmdPallet()
      await paste("view: close all editors")
      await delay(1500)
      await page.keyboard.press("Enter")
      await delay(1000)

      
        
        
      await openCmdPallet()
  
      await delay(200)
  
      await paste('new file')
  
      await delay(1000)
  
      await page.keyboard.press('Enter')
  
      await delay(500)

      await paste(source)

      await delay(500)
  
      
  
  
  
      if (options.autoFormat) {
        await save()
      }
      else { 
        await openCmdPallet()
        await delay(200)
        await paste("file: save without formatting")
        await delay(2000)
        await page.keyboard.press('Enter')  
      }
      
  
  
      await delay(500)
  
      paste(`/code.${options.lang}`)
  
      await delay(500)
      
      await page.keyboard.press('Enter')
      
      await delay(1000)
  
      
  
      
  
      await delay(2000)



  

  
  
  
      await page.evaluate((options) => {
        const linting = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-overlays")
        if (linting) linting.remove()
  
        if (options.theme === "light") {
          const numbers = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement
          numbers.style.backgroundColor = "white"
  
          const mainTextBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines") as HTMLElement
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
        const lineBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines")
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
  
      
  
      await page.screenshot({path: tempFilename})
      browser.close()
  
      
  
      console.log("cropping image", endFilename)
      await sharp(tempFilename).extract(bounds).toFile(endFilename)
      
  
  
      console.log("done cropping image", endFilename)
    })()
    
    
    return {
      id: endFilename.split("/").last,
      done
    }
    
    
    
    

    

    

    

    

    
    


    
    
  }

    
})()








