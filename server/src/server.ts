import setup from "./setup"
import puppeteer from "puppeteer"
import delay from "delay"
import merge from "deepmerge"
import sharp from "sharp"
import uidHash from "uid-safe"
import { promises as fs } from "fs"
import slugify from "slugify"
import makeDir from "mkdirp"
import clip from "clipboardy"
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
  }
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

type RenderOptions = {lang?: string, theme?: "dark" | "light", numbers?: boolean, autoFormat?: boolean, resolutionFactor?: number, }
export type ExportedFunctions = FunctionMapWithPromisesAsReturnType<{
  renderPls: (src: string, options: RenderOptions) => Promise<string>
}>


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
          log("failed once will try one more time")
          console.log(r.id)
          console.log(e)
          const r2 = await render(sourceCode, options, r.id)
          r2.done.then(() => {
            inRender.delete(r.id)
          }).catch(() => {
            log("Meh, failed again")
            console.log(r.id)
            inRender.delete(r.id)
          })
        })


        return r.id
      }
    })







    const render = async (source: string, options: RenderOptions = {}, forceEndFilename?: string) => {

      const [ tempFilename, endFilename ] = await Promise.all([tempHash(), (() => forceEndFilename !== undefined ? forceEndFilename : endHash())()])
      console.log("render request at ", nowStr(), "filename: ", endFilename, "source: \n" + source)

      optionsTypechecking(options)

      source = source.trim()


      options.resolutionFactor = Math.round(options.resolutionFactor)

      console.log("running with options", options)


      const done = (async () => {
        options = merge(defaultOptions, options) as any



        const browser = await puppeteer.launch({ 
          headless: false,
          args: ['--no-sandbox']
        })
        const page = await browser.newPage()

    
        const activeElement = async () => await page.evaluateHandle(() => document.activeElement) as any
        const type = async (text: string, ms?: number) => await (await activeElement()).type(text, ms ? {delay: ms} : undefined)

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

        const cmdW = async () => {
          await cmdKey.down()
          await page.keyboard.press('KeyW')
          await cmdKey.up()
        }


        const click = async (selector: string) => {
          await page.click(selector)
        }


        const focus = async (selector: string) => {
          await page.focus(selector)
        }



        const cmdKey = {
          async down() {
            if (isMacOs) await page.keyboard.down('MetaLeft')
            else await page.keyboard.down('ControlLeft')
          },
          async up() {
            if (isMacOs) await page.keyboard.up('MetaLeft')
            else await page.keyboard.up('ControlLeft')
          }
        }

        const openCmdPallet = async () => {
          await cmdKey.down()
          await page.keyboard.down('ShiftLeft')
          await page.keyboard.press('P')
          await page.keyboard.up('ShiftLeft')
          await cmdKey.up()
        }

        const openSettings = async () => {
          await cmdKey.down()
          await page.keyboard.press("Comma")
          await cmdKey.up()
          await delay(1500)
        }

        const cmd = async (cmd: string) => {
          await openCmdPallet()
          await delay(100)
          await type(cmd)
          await enter()
          await delay(300)
        }


        const cmdA = async () => {
          await cmdKey.down()
          await page.keyboard.press('KeyA')
          await cmdKey.up()
        }

        const deleteAll = async () => {
          await cmdA()
          await page.keyboard.press("Backspace")
        }


        
        const clickExplorerTab = async () => {
          await click("#workbench\\.parts\\.activitybar > div > div.composite-bar > div > ul > li:nth-child(1) > div.badge.explorer-viewlet-label")
        }

        const clickAddonsTab = async () => {
          await click("#workbench\\.parts\\.activitybar > div > div.composite-bar > div > ul > li:nth-child(5) > a")
        }


        const enter = async () => {
          await page.keyboard.press("Enter")
        }




        const linesOfSource = source.split("\n").length


        

    

        await page.setViewport({
          width: 1610,
          height: 780 + (20 * linesOfSource),
          deviceScaleFactor: options.resolutionFactor
        });
        console.log("Loading site...")






        await page.goto(`http://127.0.0.1:${await vsCodePort}`)

        await page.reload()


        await page.waitForSelector("#workbench\\.parts\\.editor > div.content > div > div > div > div > div.monaco-scrollable-element.mac > div.split-view-container > div > div > div.editor-container > div > div > div > div.monaco-scrollable-element.full-height-scrollable.categoriesScrollbar.mac > div.gettingStartedSlideCategories.gettingStartedSlide > div > div.categories-column.categories-column-left > div.index-list.start-container > div > ul > li:nth-child(1) > button")

        await delay(3000)

        await cmd("open user settings json")
        await delay(200)
        await deleteAll()
        await delay(100)

        await type(JSON.stringify(editorConfig))
        await delay(2000)

        await cmd("new file")
        await delay(50)
        await enter()
        
        await delay(200)



        await type(source)
        await click("#status\\.editor\\.mode > a")
        await type(fileExtensionsToLang[options.lang])
        await enter()

        await delay(500)




        if (options.theme === "dark") {
          let triedCount = 0
          let suc = false
          while (triedCount < 3) {
            try {
              await clickAddonsTab()
              await type("codesandbox theme")
              await delay(4000)
              // document.querySelector("#list_id_7_0 > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await click("#list_id_7_0 > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await click("#list_id_2_2 > div > label > div > div:nth-child(1) > div.monaco-icon-label > div")
              await delay(2000)
              await cmdW()
              suc = true
              break
            }
            catch (e) {
              await clickExplorerTab()
              error(`Failed ${triedCount} to install theme dark`)
            }
          }

          if (!suc) {
            error("Failed to install theme dark")
            throw new Error("Failed to install theme dark")
          }
        }
        else {
          let triedCount = 0
          let suc = false
          while (triedCount < 3) {
            try {    
              await clickAddonsTab()
              await type("atom one light")
              await delay(4000)
              

              
              // document.querySelector("#list_id_8_0 > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await click("#list_id_8_0 > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await click("#list_id_1_0 > div > label > div > div:nth-child(1) > div.monaco-icon-label > div")
              await delay(200)
              await cmdW()
              suc = true
              break
            }
            catch (e) {
              await clickExplorerTab()
              error(`Failed ${triedCount} to install theme light`)
            }
          }

          if (!suc) {
            error("Failed to install theme light")
            throw new Error("Failed to install theme light")
          }
        }

        

        if (options.autoFormat){
          let triedCount = 0
          let suc = false
          while(triedCount++ < 3) {
            try {
              await clickExplorerTab()
              await delay(20)
              await clickAddonsTab()
              await deleteAll()
              await type("prettier")
              await delay(4000)
              await click("#list_id_12_0 > div.extension-list-item > div.details > div.footer > div.monaco-action-bar > ul > li:nth-child(5) > a")
              await delay(2000)
              await delay(200)
              await cmdW()
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

        await delay(500)


        cmd("format document force")

        
        await delay(200)

        



        console.log("cmd pallet opened")

        await delay(10000000)
        


      //   if (options.theme.toLowerCase().includes("light")) {
      //     editorConfig["workbench.colorTheme"] = "Atom One Light"
      //   }

      //   console.log("Open settings...")

      //   await openSettings()
      //   page.evaluate(() => {
      //     (document.querySelector("#vscode-editor > div > div > div > div > div > div.split-view-container > div > div > div.title.tabs.show-file-icons > div.tabs-and-actions-container > div.editor-actions > div > div > ul > li:nth-child(1) > a") as HTMLElement).click()
      //   })
      //   await delay(2500)
      //   await page.keyboard.down('ControlLeft')
      //   await page.keyboard.press('A')
      //   await page.keyboard.up('ControlLeft')
      //   await page.keyboard.press("Backspace")

      

      //   await delay(100)
      //   await type(JSON.stringify(editorConfig))
      //   await save()
      //   await delay(500)
      //   await openSettings()

        

      //   console.log("Confirming settings...")

      //   await type("Editor: Drag and drop")
      //   await delay(1000)
      //   await page.keyboard.press("ArrowDown")
      //   await delay(1000)
      //   await page.keyboard.press("Enter")
      //   await delay(3000)

        

      //   console.log("Close everything...")


      //   await openCmdPallet()
      //   await type("view: close all editors")
      //   await delay(1500)
      //   await page.keyboard.press("Enter")
      //   await delay(1000)




        
      //   console.log("New file...")
          
      //   await openCmdPallet()
    
      //   await delay(200)
    
      //   await type('new file')
    
      //   await delay(1000)
    
      //   await page.keyboard.press('Enter')
    
      //   await delay(500)

      //   await type(source)

      //   await delay(500)

        
      //   console.log("Saving file...")
    
    
      //   if (options.autoFormat) {
      //     await save()
      //   }
      //   else { 
      //     await openCmdPallet()
      //     await delay(200)
      //     await type("file: save without formatting")
      //     await delay(2000)
      //     await page.keyboard.press('Enter')  
      //   }
        
    
    
      //   await delay(500)
    
      //   type(`/code.${options.lang}`)
    
      //   await delay(500)
        
      //   await page.keyboard.press('Enter')
        
      //   await delay(3000)


    
        

    

      //   console.log("Clear linting and doing the white thing...")
    
    
      //   const suc = await page.evaluate((options) => {
      //     const linting = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-overlays")
      //     if (linting) linting.remove()
    
      //     if (options.theme === "light") {
      //       const numbers = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement
      //       if (numbers) numbers.style.backgroundColor = "white"
    
      //       const mainTextBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines") as HTMLElement
      //       if (mainTextBody) mainTextBody.style.backgroundColor = "white"

      //       return mainTextBody && numbers
      //     }
      //     else return true
      //   }, options)

      //   if (!suc) console.warn("Warning: unable to do the white thing. Will continue anyway")
    
      //   await delay(500)

      //   console.log("Add extra lines...")
    
      //   await page.keyboard.down("ControlLeft")
      //   await page.keyboard.press("End")
      //   await page.keyboard.up("ControlLeft")
    
      //   await delay(500)
    
      //   await type("\n\n\n")
    
      //   await delay(500)
    
      //   await page.keyboard.down("ControlLeft")
      //   await page.keyboard.press("End")
      //   await page.keyboard.up("ControlLeft")
    
      //   await delay(500)

      //   console.log("Get bounds...")
    
      //   const bounds = await page.evaluate((linesOfSource, numbers) => {
      //     const lineBody = document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable > div.lines-content.monaco-editor-background > div.view-lines")
      //     const rect = lineBody.getBoundingClientRect()
      //     const lines = lineBody.querySelectorAll("div > span") as NodeListOf<HTMLElement>
    
      //     let maxWidth = 0
      //     lines.forEach((line) => {
      //       if (maxWidth < line.offsetWidth) maxWidth = line.offsetWidth
      //     })
    
      //     const firstLine = lineBody.querySelector("div")
    
      //     let lineHeight = firstLine ? firstLine.offsetHeight : 20
    
      //     const numbersWidth = numbers ? (document.querySelector("#workbench\\.editors\\.files\\.textFileEditor > div > div.overflow-guard > div.margin") as HTMLElement).offsetWidth : 0
          
          
          
      //     return { 
      //       top: rect.top,
      //       left: rect.left - numbersWidth,
      //       width: maxWidth + numbersWidth,
      //       height: linesOfSource * lineHeight
      //     }
      //   }, linesOfSource, options.numbers)
    
    
      //   for (let k in bounds) {
      //     bounds[k] = bounds[k] * options.resolutionFactor
      //   }
    
    
      //   console.log("Waiting...")
    
      //   await delay(3000)
    
      //   console.log("Screenshotting...")
    
      //   await page.screenshot({path: tempFilename + ".png"})
      //   browser.close()
    
        
    
      //   console.log("cropping image...")
      //   await sharp(tempFilename + ".png").extract(bounds).toFile(endFilename + ".png")
        
    
    

      //   console.log("done")
      })()
      
      
      return {
        id: endFilename.split("/").last,
        done: Promise.resolve() // todo
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
    resolutionFactor: 1
  }



  const typechecking = {
    theme: (t) => t === "light" || t === "dark",
    numbers: (e) => typeof e === "boolean",
    autoFormat: (e) => typeof e === "boolean",
    resolutionFactor: (e) => typeof e === "number" && e <= 20 && e >= 1
  }

  function optionsTypechecking(options: any) {
    for (let k in defaultOptions) {
      if (options[k] === undefined) options[k] = defaultOptions[k]
      else if (typechecking[k] !== undefined) if (!typechecking[k](options[k])) options[k] = defaultOptions[k]
    }
  }


  

    
})()








