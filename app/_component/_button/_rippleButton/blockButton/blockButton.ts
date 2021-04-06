import RippleButton from "./../rippleButton";

export default class BlockButton extends RippleButton {
  private textElem: HTMLElement;
  private isActive: boolean = false;
  constructor(text: string = "", activationCallback?: Function) {
    super(activationCallback);
    this.textElem = ce("button-text");
    this.content(text)
    this.apd(ce("button-container").apd(this.textElem));
  }
  content(to: string) {
    this.textElem.text(to);
  }
  public activate() {
    this.isActive = true;
    this.addClass("active");
  }
  public deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.removeClass("active");
  }
  stl() {
    return super.stl() + require('./blockButton.css').toString();
  }
}
window.customElements.define('c-block-button', BlockButton);
