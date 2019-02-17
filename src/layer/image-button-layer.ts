import { Logger } from "../base/logger";
import { AsyncTask } from "../base/async-task";
import { AsyncCallbacks } from "../base/async-callbacks";
import { Resource } from "../base/resource";
import { PonMouseEvent } from "../base/pon-mouse-event";
import { Button } from "./button";
import { TextButtonLayer } from "./text-button-layer";
import { Ponkan3 } from "../ponkan3";

export class ImageButton extends Button {
  protected direction: "horizontal" | "vertical" = "horizontal";

  public initImageButton(
    jumpFile: string | null = null,
    callFile: string | null = null,
    jumpLabel: string | null = null,
    callLabel: string | null = null,
    exp: string | null = null,
    file: string,
    direction: "horizontal" | "vertical",
  ): AsyncCallbacks {
    let cb = new AsyncCallbacks();

    this.resetButton();
    this.freeImage();

    this.initButton(jumpFile, callFile, jumpLabel, callLabel, exp);
    this.direction = direction;

    this.loadImage(file).done(() => {
      if (this.direction === "vertical") {
        this.height = Math.floor(this.imageHeight / 3);
      } else {
        this.width = Math.floor(this.imageWidth / 3);
      }
      this.setButtonStatus("normal");
      cb.callDone();
    }).fail(() => {
      cb.callFail();
      throw new Error("画像の読み込みに失敗しました。");
    });

    return cb;
  }

  public resetButton(): void {
    super.resetButton();
    this.direction = "horizontal";
  }

  public setButtonStatus(status: "normal" | "over" | "on" | "disabled") {
    super.setButtonStatus(status);

    if (this.direction === "vertical") {
      switch (status) {
        case "normal":
        case "disabled":
          this.imageY = 0;
          break;
        case "over":
          this.imageY = -Math.floor(this.imageHeight / 3);
          break;
        case "on":
          this.imageY = -Math.floor(this.imageHeight / 3 * 2);
          break;
      }
    } else {
      switch (status) {
        case "normal":
        case "disabled":
          this.imageX = 0;
          break;
        case "over":
          this.imageX = -Math.floor(this.imageWidth / 3);
          break;
        case "on":
          this.imageX = -Math.floor(this.imageWidth / 3 * 2);
          break;
      }
    }
  }

  protected static imageButtonStoreParams: string[] = [
    "direction",
  ];

  public store(tick: number): any {
    let data: any = super.store(tick);
    let me: any = this as any;
    ImageButton.imageButtonStoreParams.forEach((param: string) => {
      data[param] = me[param];
    });
    return data;
  }

  public restore(asyncTask: AsyncTask, data: any, tick: number): void {
    super.restore(asyncTask, data, tick);
  }

  public restoreAfterLoadImage(data: any, tick: number): void {
    let me: any = this as any;
    ImageButton.imageButtonStoreParams.forEach((param: string) => {
      me[param] = data[param];
    });
    super.restoreAfterLoadImage(data, tick);
  }
}

export class ImageButtonLayer extends TextButtonLayer {

  private imageButtons: ImageButton[] = [];

  public addImageButton(
    jumpFile: string | null = null,
    callFile: string | null = null,
    jumpLabel: string | null = null,
    callLabel: string | null = null,
    exp: string | null = null,
    file: string,
    x: number,
    y: number,
    direction: "horizontal" | "vertical",
  ): AsyncCallbacks {
    let name = `ImageButton ${this.imageButtons.length}`;
    let btn = new ImageButton(name, this.resource, this.owner);
    this.addChild(btn);
    this.imageButtons.push(btn);

    btn.x = x;
    btn.y = y;
    return btn.initImageButton(
      jumpFile,
      callFile,
      jumpLabel,
      callFile,
      exp,
      file,
      direction,
    );
  }

  public clearImageButtons(): void {
    this.imageButtons.forEach((imageButton) => {
      imageButton.resetButton();
      imageButton.destroy();
      this.deleteChildLayer(imageButton);
    });
    this.imageButtons = [];
  }

  public store(tick: number): any {
    let data: any = super.store(tick);
    let me: any = this as any;
  
    data.imageButtons = this.imageButtons.map(imageButton => imageButton.store(tick));
  
    return data;
  }
  
  public restore(asyncTask: AsyncTask, data: any, tick: number): void {
    this.clearImageButtons();
    if (data.imageButtons != null && data.imageButtons.length > 0) {
      data.imageButtons.forEach((imageButtonData: any) => {
        let btn = new ImageButton(imageButtonData.name, this.resource, this.owner);
        this.addChild(btn);
        this.imageButtons.push(btn);
        btn.restore(asyncTask, imageButtonData, tick);
      });
    }
    super.restore(asyncTask, data, tick);
  }
  
  protected restoreAfterLoadImage(data: any, tick: number): void {
    super.restoreAfterLoadImage(data, tick);
    if (data.imageButtons != null && data.imageButtons.length > 0) {
      for (let i = 0; i < data.imageButtons.length; i++) {
        this.imageButtons[i].restoreAfterLoadImage(data.imageButtons[i], tick);
      }
    }
  }

}

