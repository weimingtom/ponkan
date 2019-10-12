import { AsyncTask } from "../base/async-task";
import { BaseLayer } from "../base/base-layer";
import { PonMouseEvent } from "../base/pon-mouse-event";
import { Ponkan3 } from "../ponkan3";

export class Button extends BaseLayer {
  protected insideFlag: boolean = false;
  protected buttonStatus: "normal" | "over" | "on" | "disabled" = "disabled";
  protected down: boolean = false;

  public initButton(): void {
    this.clearButton();
  }

  public clearButton(): void {
    this.setButtonStatus("disabled");
    this.insideFlag = false;
    this.down = false;
  }

  public setButtonStatus(status: "normal" | "over" | "on" | "disabled"): void {
    this.buttonStatus = status;
    if (this.buttonStatus === "disabled") { this.down = false; }
    this.resource.getForeCanvasElm().style.cursor = this.resource.cursor[status];
  }

  public onMouseEnter(e: PonMouseEvent): void {
    super.onMouseEnter(e);

    if (this.buttonStatus !== "disabled") {
      this.setButtonStatus("over");
    }
    this.insideFlag = true;
  }

  public onMouseLeave(e: PonMouseEvent): void {
    super.onMouseLeave(e);

    if (this.buttonStatus !== "disabled") {
      this.setButtonStatus("normal");
    }
    this.insideFlag = false;
  }

  public onMouseDown(e: PonMouseEvent): void {
    super.onMouseDown(e);

    if (this.isInsideEvent(e) && this.buttonStatus !== "disabled") {
      this.setButtonStatus("on");
      this.down = true;
    }
  }

  public onMouseUp(e: PonMouseEvent): void {
    super.onMouseUp(e);
    this.down = false;
  }

  protected static buttonStoreParams: string[] = [
    "insideFlag",
    "buttonStatus",
  ];

  public store(tick: number): any {
    const data: any = super.store(tick);
    const me: any = this as any;
    Button.buttonStoreParams.forEach((param: string) => {
      data[param] = me[param];
    });
    return data;
  }

  public restore(asyncTask: AsyncTask, data: any, tick: number, clear: boolean): void {
    this.clearButton();
    super.restore(asyncTask, data, tick, clear);

    const me: any = this as any;
    Button.buttonStoreParams.forEach((param: string) => {
      me[param] = data[param];
    });
    this.insideFlag = false;
    this.setButtonStatus(data.buttonStatus);
  }

  public copyTo(dest: Button): void {
    super.copyTo(dest);

    const me: any = this as any;
    const you: any = dest as any;
    Button.buttonStoreParams.forEach((param: string) => {
      you[param] = me[param];
    });
  }
}

/**
 * textbuttonコマンドやimagebuttonコマンドで生成するボタンの機能
 */
export class CommandButton extends Button {
  protected jump: boolean = true;
  protected call: boolean = false;
  protected filePath: string | null = null;
  protected label: string | null = null;
  protected countPage: boolean = true;
  protected isSystemButton: boolean = false;
  protected exp: string | null = null;
  protected onEnterSoundBuf: string = "";
  protected onLeaveSoundBuf: string = "";
  protected onClickSoundBuf: string = "";
  protected systemButtonLocked: boolean = false;

  public initCommandButton(
    jump = true,
    call = false,
    filePath: string | null = null,
    label: string | null = null,
    countPage = true,
    isSystemButton = false,
    exp: string | null = null,
    onEnterSoundBuf = "",
    onLeaveSoundBuf = "",
    onClickSoundBuf = "",
  ): void {
    this.initButton();
    this.jump = jump;
    this.call = call;
    this.filePath = filePath;
    this.label = label;
    this.countPage = countPage;
    this.isSystemButton = isSystemButton;
    this.exp = exp;
    this.visible = true;
    this.onEnterSoundBuf = onEnterSoundBuf;
    this.onLeaveSoundBuf = onLeaveSoundBuf;
    this.onClickSoundBuf = onClickSoundBuf;
  }

  public clearCommandButton(): void {
    this.clearButton();
    this.jump = true;
    this.call = false;
    this.filePath = null;
    this.label = null;
    this.exp = null;
    this.onEnterSoundBuf = "";
    this.onLeaveSoundBuf = "";
    this.onClickSoundBuf = "";
  }

  // public setButtonStatus(status: "normal" | "over" | "on" | "disabled"): void {
  //   const cursor: string = "auto";
  //   if (this.isSystemButton && this.systemButtonLocked) {
  //     this.buttonStatus = "disabled";
  //   } else {
  //     this.buttonStatus = status;
  //   }
  //   if (this.buttonStatus === "disabled") { this.down = false; }
  //   this.resource.getForeCanvasElm().style.cursor = this.resource.cursor[status];
  // }

  public lockSystemButton(): void {
    if (this.isSystemButton) {
      this.systemButtonLocked = true;
      this.setButtonStatus("disabled");
    }
  }

  public unlockSystemButton(): void {
    if (this.isSystemButton) {
      this.systemButtonLocked = false;
      this.setButtonStatus("normal");
    }
  }

  public onChangeStable(isStable: boolean): void {
    super.onChangeStable(isStable);
    if (!this.isSystemButton) { return; }
    if (this.systemButtonLocked) { return; }
    if (isStable) {
      if (this.insideFlag) {
        this.setButtonStatus("over");
      } else {
        this.setButtonStatus("normal");
      }
    } else {
      this.setButtonStatus("disabled");
    }
  }

  public onMouseEnter(e: PonMouseEvent): void {
    super.onMouseEnter(e);

    if (this.buttonStatus !== "disabled") {
      if (this.onEnterSoundBuf !== "") {
        const p: Ponkan3 = this.owner as Ponkan3;
        p.getSoundBuffer(this.onEnterSoundBuf).play();
      }
    }
  }

  public onMouseLeave(e: PonMouseEvent): void {
    super.onMouseLeave(e);

    if (this.buttonStatus !== "disabled") {
      if (this.onLeaveSoundBuf !== "") {
        const p: Ponkan3 = this.owner as Ponkan3;
        p.getSoundBuffer(this.onLeaveSoundBuf).play();
      }
    }
  }

  // public onMouseDown(e: PonMouseEvent): void {
  //   super.onMouseDown(e);
  //   // if (this.isInsideEvent(e) && this.buttonStatus !== "disabled") {
  //   //   this.setButtonStatus("on");
  //   // }
  // }

  public onMouseUp(e: PonMouseEvent): void {
    const down = this.down; // super.onMouseUpでfalseになってしまうのでキャッシュしておく

    super.onMouseUp(e);
    if (!e.isLeft) { return; }

    if (down && this.isInsideEvent(e) && this.buttonStatus !== "disabled") {
      const p: Ponkan3 = this.owner as Ponkan3;
      if (this.exp !== null && this.exp !== "") {
        this.resource.evalJs(this.exp);
      }
      if (this.onClickSoundBuf !== "") {
        p.getSoundBuffer(this.onClickSoundBuf).play();
      }
      if (this.filePath != null || this.label != null) {
        if (this.jump) {
          p.conductor.stop();
          p.conductor.jump(this.filePath, this.label, this.countPage).done(() => {
            p.conductor.start();
          });
        } else if (this.call) {
          p.callSubroutine(this.filePath, this.label, this.countPage).done(() => {
            p.conductor.start();
          });
          p.conductor.stop();
        }
      }
      if (this.isSystemButton) {
        this.setButtonStatus("normal");
      } else {
        this.setButtonStatus("disabled");
      }
      e.stopPropagation();
      e.forceStop();
    }
  }

  protected static commandButtonStoreParams: string[] = [
    "jump",
    "call",
    "filePath",
    "label",
    "countPage",
    "isSystemButton",
    "exp",
    "onEnterSoundBuf",
    "onLeaveSoundBuf",
    "onClickSoundBuf",
    "systemButtonLocked",
  ];

  public store(tick: number): any {
    const data: any = super.store(tick);
    const me: any = this as any;
    CommandButton.commandButtonStoreParams.forEach((param: string) => {
      data[param] = me[param];
    });
    return data;
  }

  public restore(asyncTask: AsyncTask, data: any, tick: number, clear: boolean): void {
    this.clearCommandButton();
    super.restore(asyncTask, data, tick, clear);
  }

  public restoreAfterLoadImage(data: any, tick: number): void {
    super.restoreAfterLoadImage(data, tick);
    const me: any = this as any;
    CommandButton.commandButtonStoreParams.forEach((param: string) => {
      me[param] = data[param];
    });
    this.insideFlag = false;
    this.setButtonStatus(data.buttonStatus);
  }

  public copyTo(dest: CommandButton): void {
    super.copyTo(dest);

    const me: any = this as any;
    const you: any = dest as any;
    CommandButton.commandButtonStoreParams.forEach((param: string) => {
      you[param] = me[param];
    });
  }
}