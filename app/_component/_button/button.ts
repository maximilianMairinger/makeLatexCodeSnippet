import Element from "./../component";
import { Tel } from "extended-dom";


const activeClass = "active";

export default class Button extends Element {
  private doesFocusOnHover: boolean;
  private mouseOverListener: Tel;
  private mouseOutListener: Tel;
  private callbacks: Function[] = [];
  protected active: boolean;
  constructor(activationCallback?: Function, public enabled:boolean = true, focusOnHover:boolean = false, public tabIndex: number = 0, public obtainDefault: boolean = false, public preventFocus = false, blurOnMouseOut: boolean = false) {
    super(false);

    let alreadyPressed = false;

    this.on("mousedown", (e) => {
      if (e.which === 1) this.click(e);
    });
    this.on("mouseup", () => {
      this.removeClass(activeClass);
    });
    this.on("mouseout", () => {
      this.removeClass(activeClass);
    })
    this.on("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") if (!alreadyPressed) {
        alreadyPressed = true;
        this.click(e)
      }
    });
    this.on("keyup", ({key}) => {
      if (key === " " || key === "Enter"){
        alreadyPressed = false;
        this.removeClass(activeClass);
      }
    });
    this.on("blur", () => {
      alreadyPressed = false;
    });

    this.mouseOverListener = this.ls("mouseover", () => {
      this.focus();
    }, false)
    this.mouseOutListener = this.ls("mouseout", () => {
      this.blur();
    }, false)

    this.addActivationCallback(activationCallback);
    this.focusOnHover = focusOnHover;
    this.blurOnMouseOut = blurOnMouseOut;
  }
  public set blurOnMouseOut(to: boolean) {
    if (to) this.mouseOutListener.enable();
    else this.mouseOutListener.disable();
  }
  public addActivationCallback(cb?: Function) {
    if (cb !== undefined) this.callbacks.add(cb);
  }
  public removeActivationCallback(cb?: Function) {
    if (cb !== undefined) this.callbacks.removeV(cb);
  }
  public set focusOnHover(to: boolean) {
    this.doesFocusOnHover = to;
    if (to) {
      this.mouseOverListener.enable();
      this.mouseOutListener.enable();
    }
    else {
      this.mouseOverListener.disable();
      this.mouseOutListener.disable();
    }
  }
  public get focusOnHover(): boolean {
    return this.doesFocusOnHover;
  }
  public click(e?: Event) {
    if (e !== undefined && !this.obtainDefault) e.preventDefault();
    if (this.enabled) {
      if (!this.preventFocus) this.focus();
      this.addClass(activeClass);
      this.callbacks.forEach(f => {f(e);});
    }
  }
  stl() {
    return require('./button.css').toString();
  }
  pug() {
    return ""
  }
}

window.customElements.define('c-button', Button);
