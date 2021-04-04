import { DataBase } from "josm"
import ger from "./../res/lang/ger.json"

interface Lang {
  "makeLatexCodeSnippet": {
    "longName": "Make latex code snippet"
  }
}



export const lang = new DataBase<Lang>(ger as Lang)
export default lang

