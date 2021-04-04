import setup from "./setup"



setup("makeLatexCodeSnippet").then(async ({app, db}) => {

  
  app.post("/echo", (req, res) => {
    res.send(req.body)
  })
})
