import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"
import sharp from "sharp"
import uidHash from "uid-safe"
import { promises as fs } from "fs"
import slugify from "slugify"
import makeDir from "mkdirp"
import { port as vsCodePort } from "./vscode"
import { functionBasedWsClient, functionBasedWsServer, FunctionMapWithPromisesAsReturnType, WebSocket } from "./wsUtil"
import os from "os"


const isMacOs = os.platform() === 'darwin'








const editorConfig = {
  "editor.formatOnSave": false,
  "editor.fontSize": 18,
  // "editor.tabSize": 2,
  "editor.minimap.enabled": false,
  "workbench.editor.openSideBySideDirection": "down",
  "javascript.autoClosingTags": false,
  "typescript.autoClosingTags": false,
  "typescript.tsserver.useSyntaxServer": "never",
  "workbench.colorTheme": "Visual Studio Light",
  "html.autoClosingTags": false,
  "typescript.locale": "en",
  "editor.wrappingIndent": "none",
  "editor.autoIndent": "none",
  "editor.quickSuggestions": {
    "comments": "off",
    "other": "off",
    "strings": "off"
  },
  "editor.autoClosingBrackets": "never",
  "editor.formatOnType": false,
  "editor.acceptSuggestionOnEnter": "off",
  "editor.wordWrap": "on",
  "editor.matchBrackets": "never",
  "editor.bracketPairColorization.enabled": false,
  "workbench.colorCustomizations": {
    "editorError.foreground": "#00000000",
    "editorWarning.foreground": "#00000000",
    "editorOverviewRuler.errorForeground": "#00000000",
    "editorOverviewRuler.warningForeground": "#00000000",
  },
  "prettier.semi": false
}







const fileExtensionsToLang = {
  "js": "javascript",
  "ts": "typescript",
  "html": "html",
  "css": "css",
  "scss": "scss",
  "sass": "sass",
  "less": "less",
  "json": "json",
  "md": "markdown",
  "py": "python",
  "rb": "ruby",
  "rs": "rust",
  "go": "go",
  "java": "java",
  "c": "c",
  "cpp": "cpp",
  "cs": "csharp",
  "php": "php",
  "sh": "shellscript",
  "yml": "yaml",
  "yaml": "yaml",
  "xml": "xml",
  "svg": "xml",
  "jsx": "javascriptreact",
  "tsx": "typescriptreact"
}


function slash(path: string) {
  return path.replace(/\\/g, '/')
}


function nowStr() {
  return new Date().toLocaleString("de-AT", { timeZone: "Europe/Vienna" })
}

function slugPath(path) {
  return slash(path).split("/").map((s) => slugify(s)).join("/")
}

function slugName(name: string) {
  return slugify(name).split("/").join("")
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

type RenderOptions = {lang?: string, theme?: "dark" | "light-pure" | "light-offwhite", numbers?: boolean, autoFormat?: boolean, resolutionFactor?: number, name?: string, width?: number }
export type ExportedFunctions = FunctionMapWithPromisesAsReturnType<{
  renderPls: (src: string, options: RenderOptions) => Promise<string>
}>



const minWidth = 350
const numbersWith = 86
const sideNavWidth = 48


import { webLog as WebTypes } from "../../app/_component/site/site"
(async () => {
  const app = setup({ webSockets: true })
  

  app.ws("/ws", (ws) => {
    const webConsole = functionBasedWsClient<typeof WebTypes>(ws)
    
    function log(...args: any) {
      webConsole.log(args.join(" "))
      console.log(...args)
    }
  
    function error(...args: any) {
      webConsole.error(args.join(" "))
      console.error(...args)
    }



    functionBasedWsServer(ws, {
      async renderPls(sourceCode: string, options: RenderOptions) {
        
        const r = await render(sourceCode, options)    
        inRender.set(r.id + ".png", r.done)
        
        r.done.then(() => {
          inRender.delete(r.id)
        }).catch(async (e) => {
          error("failed once will try one more time")
          console.log(r.id)
          console.log(e)
          const r2 = await render(sourceCode, options)
          r2.done.then(() => {
            inRender.delete(r.id)
          }).catch(() => {
            error("Meh, failed again")
            console.log(r.id)
            inRender.delete(r.id)
          })
        })


        return r.id
      }
    })







    const render = async (source: string, options: RenderOptions = {}) => {

      const [ tempFilename, endFilename ] = await Promise.all([tempHash(), options.name === undefined ? endHash() : "public/renders/" + slugName(options.name)])
      console.log("render request at ", nowStr(), "filename: ", endFilename, "source: \n" + source)

      optionsTypechecking(options)

      source = source.trim()


      options.resolutionFactor = Math.round(options.resolutionFactor)

      console.log("running with options", options)


      const done = (async () => {
        options = merge(defaultOptions, options) as any



        

        const browser = await puppeteer.launch({ 
          headless: false,
          args: ['--no-sandbox'],
          devtools: true
        })

        const page = await browser.newPage()
        page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4427.0 Safari/537.36")
    
        const activeElement = async () => await page.evaluateHandle(() => document.activeElement) as any
        const type = async (text: string, ms?: number) => await (await activeElement()).type(text, ms ? {delay: ms} : undefined)



        const closeEditor = async () => {
          await cmd("workbench.action.closeActiveEditor")
        }


        const click = async (selector: string) => {
          await page.click(selector)
        }


        const focus = async (selector: string) => {
          await page.focus(selector)
        }




        const openCmdPallet = async () => {
          await mouseClick(20, viewPortOptions.height - 50)
          await delay(1000)
          await mouseClick(100, viewPortOptions.height - 285)
        }



        const cmd = async (cmd: string) => {
          await openCmdPallet()
          await delay(100)
          await type(cmd)
          await delay(150)
          await enter()
          await delay(300)
        }



        const selectAll = async () => {
          await cmd("select all")
        }

        const deleteAll = async () => {
          await selectAll()
          await page.keyboard.press("Backspace")
        }


        let progressScreenshotCount = 1
        const progressScreenshot = async () => {
          const fileName = `public/progress-${progressScreenshotCount++}.png`
          await page.screenshot({path: fileName})
        }



        const clickExplorerTab = async () => {
          await click("#workbench\\.parts\\.activitybar > div > div.composite-bar > div > ul > li:nth-child(1) > a")
        }

        const clickSeachTab = async () => {
          await click("#workbench\\.parts\\.activitybar > div > div.composite-bar > div > ul > li:nth-child(2) > a")
        }

        const clickAddonsTab = async () => {
          await click("#workbench\\.parts\\.activitybar > div > div.composite-bar > div > ul > li:nth-child(5) > a")
        }


        const enter = async () => {
          await page.keyboard.press("Enter")
        }


        const mouseClick = async (x: number, y: number) => {


          // page.evaluate((x, y) => {
          //   (window as any).lastCordIndec = null
          //   function createCoordIndecator(x, y) {
          //     if ((window as any).lastCordIndec) (window as any).lastCordIndec.remove()
          //     const div = document.createElement("div");
          //     (window as any).lastCordIndec = div;
          //     div.style.position = "absolute"
          //     div.style.left = x + "px"
          //     div.style.top = y + "px"
          //     div.style.width = "10px"
          //     div.style.height = "10px"
          //     div.style.backgroundColor = "red"
          //     div.style.zIndex = "100000"
          //     div.style.pointerEvents = "none"
          //     document.body.appendChild(div)
          //   }
          
          // createCoordIndecator(x, y)
          // }, x, y)
          // await delay(1000)
          await page.mouse.move(x, y)
          await page.mouse.click(x, y)
        }


        const hideSidebar = async () => {
          await cmd("close primary side bar")
        }



        const addEmptyLines = async (lines: number) => {
          let txt = ""
          for (let i = 0; i < lines; i++) {
            txt += "\n"
          }

          await type(txt)
        }



        const averageCharactersPerLine = 20
        const estimateLinesOfSource = Math.ceil(source.length / averageCharactersPerLine)
        

        


        if ((options.width + numbersWith + sideNavWidth) < minWidth) {
          options.width = minWidth - numbersWith - sideNavWidth
        }

        const viewPortOptions = {
          width: options.width + numbersWith + sideNavWidth,
          height: 400 + ((editorConfig["editor.fontSize"] + 3) * estimateLinesOfSource),
          deviceScaleFactor: options.resolutionFactor
        }
        await page.setViewport(viewPortOptions);
        console.log("Loading site...")



        log(`Opening vscode`)


        await page.goto(`http://127.0.0.1:${await vsCodePort}`)

        await page.reload()


        


        await page.waitForSelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.editor-container > div > div > div > div.monaco-scrollable-element.full-height-scrollable.categoriesScrollbar > div.gettingStartedSlideCategories.gettingStartedSlide > div > div.categories-column.categories-column-left > div.index-list.start-container > div > ul > li:nth-child(1) > button")

        await delay(5000)




        log(`Setting user settings`)
        
        await openCmdPallet()
        await delay(1000)
        await progressScreenshot()
        await type("open user settings json")
        await delay(1000)
        await progressScreenshot()
        await enter()
        await delay(1000)
        await progressScreenshot()

        await cmd("open user settings json")
        await progressScreenshot()
        await delay(200)
        await deleteAll()
        await progressScreenshot()
        await delay(100)

        await type(JSON.stringify(editorConfig))
        await progressScreenshot()
        await delay(2000)

        log(`Writing your code to file`)

        await cmd("new file")
        await delay(50)
        await enter()
        await progressScreenshot()
        
        await delay(100)
        await type(source)
        await progressScreenshot()

        log(`Setting language`)

        await cmd("change language mode")
        await type(fileExtensionsToLang[options.lang])
        await enter()
        await progressScreenshot()

        await delay(500)


        log(`Setting theme`)


        if (options.theme === "dark") {
          let triedCount = 0
          let suc = false
          while (triedCount++ < 3) {
            try {
              await clickAddonsTab()
              await type("codesandbox theme")

              await delay(10000000)
              await delay(4000)
              await click(".monaco-list-rows > :first-child > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await click(".quick-input-list .monaco-list-rows > :nth-child(3)")
              await delay(2000)
              await closeEditor()
              suc = true
              break
            }
            catch (e) {
              await clickExplorerTab()
              error(`Failed ${triedCount} times to install theme dark`)
              console.error(e)
            }
          }



          if (!suc) {
            error("Failed to install theme dark")
            throw new Error("Failed to install theme dark")
          }
        }
        else if (options.theme.includes("light")) {
          let triedCount = 0
          let suc = false
          while (triedCount++ < 3) {
            try {    
              await clickAddonsTab()
              await type("atom one light")
              await delay(4000)
              await progressScreenshot()
              


              await click(".monaco-list-rows > :first-child > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await progressScreenshot()
              await click(".quick-input-list .monaco-list-rows > :first-child")
              await delay(200)
              await progressScreenshot()
              await closeEditor()
              suc = true
              break
            }
            catch (e) {
              await clickExplorerTab()
              error(`Failed ${triedCount} times to install theme light`)
              console.error(e)
            }
          }

          if (!suc) {
            error("Failed to install theme light")
            throw new Error("Failed to install theme light")
          }
        }


        if (options.autoFormat){
          log(`Formatting code`)

          let triedCount = 0
          let suc = false
          while(triedCount++ < 3) {
            try {
              await clickExplorerTab()
              await delay(200)
              await clickAddonsTab()
              await deleteAll()
              await type("prettier")
              await delay(4000)
              await progressScreenshot()
              await click(".monaco-list-rows > :first-child > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await progressScreenshot()
              await closeEditor()
              await delay(500)
              await cmd("format document force")
              await progressScreenshot()
              suc = true
              break
            }
            catch(e) {
              error(`Failed ${triedCount} to install prettier`)
            }
          }
          if (!suc) {
            error("Failed to install prettier")
            throw new Error("Failed to install prettier")
          }
          
          
        }

        await addEmptyLines(1)

        
        await delay(200)

        
        if (options.theme === "light-pure") {
          try {
            page.evaluate(() => {
              (document.querySelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.editor-container > div > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background") as HTMLElement).style.backgroundColor = "white";
              (document.querySelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.editor-container > div > div > div.overflow-guard > div:nth-child(1)") as HTMLElement).style.backgroundColor = "white";
            })
          }
          catch(e) {
            error(`Unable to set pure light theme, continuing...`)
          }
          
        }

        await hideSidebar()

        log(`Getting code bounds`)

        let bounds: any
        try {
          bounds = await page.evaluate((numbers, fontSize) => {
            const lineBody = document.querySelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.editor-container > div > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs > div.lines-content.monaco-editor-background > div.view-lines.monaco-mouse-cursor-text")
            const rect = lineBody.getBoundingClientRect()
            const lines = lineBody.querySelectorAll("div > div > span") as NodeListOf<HTMLElement>
            const linesOfSource = lines.length - 2
      
            let maxWidth = 0
            lines.forEach((line) => {
              if (maxWidth < line.offsetWidth) maxWidth = line.offsetWidth
            })
      
            const firstLine = lineBody.querySelector("div > div") as HTMLSpanElement
      
            let lineHeight = firstLine ? firstLine.offsetHeight : (fontSize + 3) 
      
            const numbersWidth = numbers === undefined ? (document.querySelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element > div.split-view-container > div > div > div.editor-container > div > div > div.overflow-guard > div:nth-child(1)") as HTMLElement).offsetWidth : 0
            
            
            

            return { 
              top: rect.top,
              left: rect.left - numbersWidth,
              width: maxWidth + numbersWidth,
              height: linesOfSource * lineHeight
            }
          }, options.numbers, editorConfig["editor.fontSize"])
        }
        catch(e) {
          error(`Unable to get code bounds, hence cannot crop image. Continuing...`)
        }


        console.log(bounds)

        log(`Taking screenshot`)

        await page.screenshot({path: tempFilename + ".png"})
        browser.close()
        


        if (bounds) {
          for (let k in bounds) {
            bounds[k] = bounds[k] * options.resolutionFactor
          }
          log(`Cropping image`)
          try {
            await sharp(tempFilename + ".png").extract(bounds).toFile(endFilename + ".png")
          }
          catch(e) {
            error(`Unable to crop image. Primary sharp failure. Continuing...`)
            await fs.copyFile(tempFilename + ".png", endFilename + ".png")
          }
          
        }
        else {
          await fs.copyFile(tempFilename + ".png", endFilename + ".png")
        }

        


        log(`Done`)
        

      })()
      
      
      return {
        id: endFilename.split("/").last,
        done
      } 
    }

    try {
//       render(`function slugPath(path) {return slash(path).split("/").map((s) => slugify(s)).join("/")
// }`, {})
    }
    catch(e) {console.error("failed render")}
    


    // log("ws connected")

  })

  



  const inRender = new Map()



  app.get("/renders/:id", (req, res, continue_) => {
    console.log("middle")
    const renderDone = inRender.get(req.params.id)
    console.log(req.params.id)
    if (renderDone !== undefined) {
      renderDone.then(() => {
        res.sendFile(`public/renders/${req.params.id}`)
      })
    }
    else res.sendFile(`public/renders/${req.params.id}`)
  })

  console.log("Starting :)")



  await makeDir("tmp")
  await makeDir("public/renders")


  

  const tempHash = await constrIncFileHash("tmp", "screenshot_", "")
  const endHash = await constrIncFileHash("public/renders/", "", "")

  

  const defaultOptions = {
    lang: "js",
    theme: "light",
    numbers: false,
    autoFormat: true,
    resolutionFactor: 1,
    width: 1000
  }



  const typechecking = {
    theme: (t) => t === "light" || t === "dark",
    numbers: (e) => typeof e === "boolean",
    autoFormat: (e) => typeof e === "boolean",
    resolutionFactor: (e) => typeof e === "number" && e <= 20 && e >= 1,
    width: (e) => typeof e === "number" && e <= 20000 && e >= minWidth,
  }

  function optionsTypechecking(options: any) {
    for (let k in defaultOptions) {
      if (options[k] === undefined) options[k] = defaultOptions[k]
      else if (typechecking[k] !== undefined) if (!typechecking[k](options[k])) options[k] = defaultOptions[k]
    }
  }


  

    
})()








