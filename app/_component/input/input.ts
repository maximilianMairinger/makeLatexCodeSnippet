import { Data } from "josm";
import { ChangeEvent } from "mongodb";
import "../../global"



type Type = "password" | "text" | "number" | "email" | "integer" | "integerSigned" | "numberSigned"

function constrStrictValidation(inputElem: { onInput: Function, offInput: Function, onKeydown: Function, offKeydown: Function, value: Function }) {
  const activeInstanceCount = new Data(0)
  const oneIsActive = activeInstanceCount.tunnel((count) => count !== 0)

  
  let lastActive: string
  const lastActiveF = (value) => {
    setTimeout(() => {
      lastActive = value
    })
  }
  oneIsActive.get((oneActive) => {
    if (oneActive) {
      lastActive = inputElem.value()
      inputElem.onInput(lastActiveF)
    }
    else inputElem.offInput(lastActiveF)
  }, false) 

  const allInstances: Data<boolean>[] = []
  const strictValidate = (regex: RegExp, onInputCharacterRegex?: RegExp, initVal: boolean = false) => {

    const active = new Data(initVal)

    if (onInputCharacterRegex) {
      const f = (e: KeyboardEvent) => {
        if (!e.ctrlKey && !e.altKey && e.key.length === 1 && !e.key.match(onInputCharacterRegex)) {
          e.preventDefault()
          e.stopPropagation()
          e.returnValue = false //IE
        }
      }
      active.get((ac) => {
        if (ac) inputElem.onKeydown(f)
        else inputElem.offKeydown(f)
      }, false)

      if (active.get()) inputElem.onKeydown(f)
      
    }
    
    
    const f = (value, e?) => {
      if (!value.match(regex)) inputElem.value(lastActive)
    }
    
    active.get((active) => {
      if (active) {
        activeInstanceCount.set(activeInstanceCount.get() + 1)
        inputElem.onInput(f)
      }
      else {
        activeInstanceCount.set(activeInstanceCount.get() - 1)
        inputElem.offInput(f)
      }
    }, false)
    if (active.get()) {
      activeInstanceCount.set(activeInstanceCount.get() + 1)
      inputElem.onInput(f)
    }
    allInstances.add(active)
    return active
  }

  strictValidate.disableAll = function() {
    allInstances.Inner("set", [false])
  }
  
  return strictValidate
}


var emailValidationRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export type Value = string | number

export default function createInput(_placeholder: string = "", __type: Type = "text", submitCallback?: (value: string | number, e: KeyboardEvent) => void, _value?: any, customVerification?: (value?: string | number) => (boolean | string | void) | Promise<(boolean | string | void)>, intrusiveValidation: boolean = true, formHolder?: (set: string) => string | void) {
  const t = ce("c-input") as any

  let lastVal: string
  let lastResp: Promise<any>

  let placeholderElem: HTMLElement;
  let input: HTMLInputElement = ce("input");

  input.setAttribute("autocomplete", "new-password")

  let enterAlreadyPressed = false;
  const enabled = new Data(true);
  (() => {
    const navigationCodes = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]

    const disabledFunc = (e: KeyboardEvent) => {
      if (!navigationCodes.includes(e.code)) {
        e.preventDefault()
        e.stopPropagation()  
      }
    }
    
    enabled.get((enabled) => {
      if (enabled) {
        input.removeEventListener("keydown", disabledFunc)
        t.removeClass("disabled")
      }
      else {
        input.addEventListener("keydown", disabledFunc)
        t.addClass("disabled")
        enterAlreadyPressed = false
      }
    }, false)
    
    
  })();

  

  const strictValidate = constrStrictValidation({
    onInput: onForceValidatorInput,
    offInput: offForceValidatorInput,
    onKeydown(f) {
      input.on("keydown", f)
    }, 
    offKeydown(f) {
      input.off("keydown", f)
    },
    value(v?) {
      if (v === undefined) return input.value
      else input.value = v.toString()
    }
  })

  const onlyNum = strictValidate(/^\+?[0-9]*\.?[0-9]*$/, /[0-9]|\.|\+|-/)
  const onlyInt = strictValidate(/^[0-9]*$/)
  const onlySignedNum = strictValidate(/^(\+|-)?[0-9]*\.?[0-9]*$/)
  const onlySignedInt = strictValidate(/^(\+|-)?[0-9]*$/)
 

  
  let valueSilentDefault = false


  let isUp: boolean = false;  
  let isFocused: boolean = false;

  let inputListenersForceValidator = []
  let inputListeners: {
    force: ((value: Value, valid: Promise<boolean>, e?: InputEvent) => void)[],
    normal: ((value: Value, e?: InputEvent) => void)[]
  } = {
    force: [],
    normal: []
  }
  let changeListeners: {
    force: ((value: Value, valid: Promise<boolean>, e?: ChangeEvent) => void)[],
    normal: ((value: Value, e?: ChangeEvent) => void)[]
  } = {
    force: [],
    normal: []
  }
  const focusListener = []
  const blurListener = []


  

  let _type: Type




  
  type(__type);

  input.spellcheck = false

  placeholderElem = ce("input-placeholder");

  placeholder(_placeholder);
  
  

  // ----- Validation start

  if (formHolder) {
    onInput((e) => {
      let q = formHolder(e as any)
      if (q !== undefined) value(q as any, true)
    }, true)
  }




  let mousedown = false
  input.on('mousedown', () => {
    mousedown = true
  });


  
  input.on("keydown", (e) => {
    if (e.key === "Enter" && submitCallback !== undefined && !enterAlreadyPressed && !t.currentlyInvalid) {
      enterAlreadyPressed = true;
      submitCallback(value(), e);
    }
  });
  input.on("keydown", (e: any) => {
    e.preventHotkey = "input";
  })
  input.on("keyup", ({key}) => {
    if (key === "Enter") {
      enterAlreadyPressed = false;
    }
  });

  
  input.on("focus", () => {
    focusListener.Call()
    isFocused = true;


    placeHolderUp()



    if (!mousedown) {
      if (input.value !== "") input.select()
    }
  });
  input.on("blur", () => {
    if (!isFocused) return
    blurListener.Call()
    isFocused = false;
    mousedown = false
    enterAlreadyPressed = false
    if (!rawValue()) placeHolderDown();
  });


  (t as HTMLElement).appendChild(placeholderElem as any)
  t.appendChild(input as any as HTMLElement)

  if (_value !== undefined) value(_value);


  function constrInputListenerCaller(ls: {normal: any[], force: any[]}) {
    return async function(e) {
      const val = input.value
      for (let f of inputListenersForceValidator) {
        f(val)
      }

      valueSilentDefault = true
      let resInvalidProm: any
      let invalidProm = new Promise<boolean | string>((r) => {
        resInvalidProm = r
      })
      let validProm = invalidProm.then((invalid) => !invalid)

      ls.force.Call(input.value, validProm)
      validate(value()).then(resInvalidProm)
      if (await validProm) ls.normal.Call(value(), e as any)
      
      if (intrusiveValidation) showInvalidation(await invalidProm)
       
      valueSilentDefault = false
    }
  }


  input.addEventListener("input", constrInputListenerCaller(inputListeners))
  input.addEventListener("change", constrInputListenerCaller(changeListeners))

  const iconHolder = ce("icon-holder")
  t.apd(iconHolder)
  iconHolder.hide()
  const arrowIcon = ce("arrow-icon")
  arrowIcon.innerHTML = require("./arrow.pug").default
  

  


  


  // constructor


  publicize("focus", focus)
  publicize("enabled", enabled)
  publicize("blur", blur)
  publicize("onFocus", onFocus)
  publicize("offFocus", offFocus)
  publicize("onBlur", onBlur)
  publicize("offBlur", offBlur)
  publicize("onInput", onInput)
  publicize("offInput", offInput)
  publicize("onChange", onChange)
  publicize("offChange", offChange)
  publicize("placeholder", placeholder)
  publicize("setActionButton", setActionButton)
  publicize("removeActionButton", removeActionButton)
  publicize("type", type)
  publicize("isValid", isValid)
  publicize("value", value)
  publicize("showInvalidation", showInvalidation)
  publicize("select", select)
  publicize("elem", input)
  publicize("setCustomVerification", setCustomVerification)


  return t as HTMLElement & {
    elem: HTMLInputElement,
    setCustomVerification: (f: Function) => any,
    enabled: Data<boolean>
    focus(): void,
    blur(): void,
    setActionButton(f: Function, icon?: HTMLElement): HTMLElement
    removeActionButton(): void
    onFocus(f: Function): void
    offFocus(f: Function): void
    onBlur(f: Function): void
    offBlur(f: Function): void
    onInput(f: (value: Value, e?: InputEvent) => void, force?: false): void,
    onInput(f: (value: Value, valid: Promise<boolean>, e?: InputEvent) => void, force: true): void,
    offInput(f: (value: Value, e?: InputEvent) => void, force?: false): void,
    offInput(f: (value: Value, valid: Promise<boolean>, e?: InputEvent) => void, force: true): void,
    onChange(f: (value: Value, e?: InputEvent) => void, force?: false): void,
    onChange(f: (value: Value, valid: Promise<boolean>, e?: InputEvent) => void, force: true): void,
    offChange(f: (value: Value, e?: InputEvent) => void, force?: false): void,
    offChange(f: (value: Value, valid: Promise<boolean>, e?: InputEvent) => void, force: true): void,
    placeholder(): string,
    placeholder(to: string): void,
    type(to: "password" | "text" | "number" | "email" | "integer"): void
    type(): "password" | "text" | "number" | "email" | "integer"
    isValid(emptyAllowed?: boolean): boolean
    value(to: string | number, silent?: boolean): Promise<void>
    value(): string
    currentlyInvalid: boolean
    showInvalidation(valid?: boolean | string | void): void
    select(): void
  }


  

  function setActionButton(listener: Function, icon: HTMLElement = arrowIcon) {
    iconHolder.show()
    iconHolder.html("")
    iconHolder.apd(icon)
    iconHolder.on("mousedown", listener as any)
    iconHolder.on("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })

    t.addClass("action-active")
    return icon
  }

  function removeActionButton() {
    t.removeClass("action-active")
  }


  function setCustomVerification(f) {
    customVerification = f
  }

  

  
  function publicize(propName: string, prop: any) {
    t[propName] = prop
  }


  /* public */ function select() {
    input.select()
  }




  /* public */function focus() {
    input.focus()
  }
  /* public */function blur() {
    input.blur()
  }

  /* public */function onFocus(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    focusListener.add(f as any)
  }
  /* public */function offFocus(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    focusListener.rmV(f as any)
  }

  /* public */function onBlur(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    blurListener.add(f as any)
  }
  /* public */function offBlur(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    blurListener.rmV(f as any)
  }

  
  
  /* public */function onInput(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    inputListeners[force ? "force" : "normal"].add(f as any)
  }
  /* public */function offInput(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    inputListeners[force ? "force" : "normal"].rmV(f as any)
  }

  /* private */function onForceValidatorInput(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    inputListenersForceValidator.add(f as any)
  }
  /* private */function offForceValidatorInput(f: (value: Value, e?: InputEvent) => void, force: boolean = false) {
    inputListenersForceValidator.rmV(f as any)
  }
  

  /* public */function onChange(f: (value: Value, e?: ChangeEvent) => void, force: boolean = false) {
    changeListeners[force ? "force" : "normal"].add(f as any)
  }
  /* public */function offChange(f: (value: Value, e?: ChangeEvent) => void, force: boolean = false) {
    changeListeners[force ? "force" : "normal"].rmV(f as any)
  }


  /* public */function placeholder(to?: string) {
    if (to !== undefined) placeholderElem.html(to)
    else return placeholderElem.txt()
  }

  /* public */function type(to?: Type) {
    if (to !== undefined) {
      if (to === "number") {
        strictValidate.disableAll()
        onlyNum.set(true)
        input.inputMode = "decimal"
        input.type = "text"
      }
      else if (to === "numberSigned") {
        strictValidate.disableAll()
        onlySignedNum.set(true)
        input.inputMode = "decimal"
        input.type = "text"
      }
      else if (to === "integer") {
        strictValidate.disableAll()
        onlyInt.set(true)
        input.inputMode = "numeric"
        input.type = "text"
      }
      else if (to === "integerSigned") {
        strictValidate.disableAll()
        onlySignedInt.set(true)
        input.inputMode = "numeric"
        input.type = "text"
      }
      else {
        strictValidate.disableAll()
        input.type = to
      }
      
      _type = to;
    }
    else return _type
  }
  /* public */async function isValid(emptyAllowed: boolean = true) {
    let valid = !await validate();
    if (emptyAllowed) return valid;
    return !!rawValue() && valid;
  }

  
  
  /* public */function value(to?: Value, silent = valueSilentDefault): any {
    if (to !== undefined) {
      return (async () => {
        input.value = to.toString();
        for (let f of inputListenersForceValidator) {
          f(input.value)
        }

        alignPlaceHolder();
    
        let resInvalidProm: Function
        let invalidProm = new Promise<boolean | string>((r) => {
          resInvalidProm = r
        })

        if (!silent) {
          let validProm = new Promise<boolean>((res) => {
            invalidProm.then((invalid) => {
              res(!invalid)
            })
          })
          inputListeners.force.Call(input.value, validProm)
          changeListeners.force.Call(input.value, validProm)
        }


        validate(input.value).then((e) => {
          resInvalidProm(e)
        })
  
      
      
        let invalid = await invalidProm
        
          
    
    
        
        showInvalidation(invalid)
        
          
    
  
        
    
        // onInput
        if (!silent) {
          if (!invalid) {
            inputListeners.normal.Call(value())
            changeListeners.normal.Call(value())
          }
        }
      })()
    }
    else {
      let v = input.value;
      if (input.type === "number") {
        return +v;
      }
      return v;
    }
  }

  
  /* private */ function validate(val: any = value()): Promise<string | boolean | void> {
    if (lastVal === val) return lastResp
    lastVal = val
    lastResp = (async () => {
      let invalid: string | boolean | void = false
      if (type() === "number") invalid = isNaN(val) ? "Eine Zahl erwartet" : false;
      else if (type() === "email") invalid = emailValidationRegex.test((val).toLowerCase()) ? "Keine valide Email Adresse" : false;
      if (customVerification !== undefined) {
        let returnInvalid = await customVerification(val)
        if (typeof returnInvalid === "boolean") {
          if (!returnInvalid) invalid = true
        }
        else if (typeof returnInvalid === "string") {
          if (returnInvalid) invalid = returnInvalid
        }
      }
      if (!val) invalid = false
      return invalid;
    })()

    return lastResp
  }
  /* private */ function rawValue() {
    return input.value
  }
  /* private */ function alignPlaceHolder() {
    if (!rawValue() && !isFocused) placeHolderDown();
    else placeHolderUp();
  }
  /* private */ function placeHolderUp() {
    if (!isUp) {
      //@ts-ignore
      placeholderElem.css({transform: "translate(-13px, -28px)", fontSize: ".8em", minWidth: "127%"});
      isUp = true;
      placeholderElem.css("cursor", "auto");
    }
  }
  /* private */ function placeHolderDown() {
    if (isUp) {
      //@ts-ignore
      placeholderElem.css({transform: "translate(0, 0)", fontSize: "1em", minWidth: "100%"});
      isUp = false;
      placeholderElem.css("cursor", "text");
    }
  }
  
  /* public */ function showInvalidation(valid: boolean | string | void = true) {
    if (valid) {
      t.addClass("invalid")
      if (valid === true) {
        t.title = "Invalid input";
      }
      else if (typeof valid === "string") {
        t.title = valid
      }
    }
    else {
      t.title = "";
      t.removeClass("invalid")
    }

    //@ts-ignore
    t.currentlyInvalid = !!valid
  }

}

