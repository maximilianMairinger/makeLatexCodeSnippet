import Button from "./../button";
import delay from "delay"

export default abstract class RippleButton extends Button {
  private ripples: HTMLElement;
  private wave: HTMLElement;
    constructor(activationCallback?: Function, enabled?: boolean, focusOnHover?: boolean, tabIndex?: number) {
      super((e) => {
        this.initRipple(e);
      }, enabled, focusOnHover, tabIndex);
      this.addActivationCallback(activationCallback);

      this.wave = ce("button-wave");

      this.ripples = ce("button-waves");
      this.apd(this.ripples);
    }
    public initRipple(e: MouseEvent | KeyboardEvent | "center") {
      //@ts-ignore
      let r: HTMLElement = this.wave.cloneNode();
      this.ripples.append(r);

      

      let letsFade = new Promise((letsFade) => {
        let x;
        let y;
  
        if (e instanceof MouseEvent) {
          let offset = this.absoluteOffset();
          x = e.pageX - offset.left - r.width() / 2;
          y = e.pageY - offset.top - r.height() / 2;
  
          this.on("mouseup", letsFade, {once: true});
          this.on("mouseout", letsFade, {once: true});
        }
        else {
          x = this.width() / 2 - r.width() / 2;
          y = this.height() / 2 - r.height() / 2;
  
          //fadeOut
          this.on("keyup", letsFade, {once: true});
          this.on("blur", letsFade, {once: true});
        }
        r.css({
           marginTop: y,
           marginLeft: x
        });

        
      })

      r.anim([{transform: "scale(0)", offset: 0}, {transform: "scale(" + this.width() / 25 * 2.2 + ")"}], 700);

      Promise.all([delay(350), letsFade]).then(async () => {
        await r.anim({opacity: 0}, {duration: 400});
        r.remove();
      })




      


    }
    stl() {
      return super.stl() + require('./rippleButton.css').toString();
    }
}
