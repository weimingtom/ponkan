// import { Logger } from "./logger";
import { PonEventHandler } from "./pon-event-handler";
import { ReadUnread } from "./read-unread";
import { Resource } from "./resource";
import { Script } from "./script";
import { Tag } from "./tag";

export interface IConductorEvent {
  onLabel(labelName: string, line: number, tick: number): "continue" | "break";
  onSaveMark(saveMarkName: string, comment: string, line: number, tick: number): "continue" | "break";
  onJs(js: string, printFlag: boolean, line: number, tick: number): "continue" | "break";
  onTag(tag: Tag, line: number, tick: number): "continue" | "break";
  onChangeStable(isStable: boolean): void;
  onError(e: any): void;
}

export enum ConductorState {
  Stop = 0,
  Run,
  Sleep,
}

export class Conductor {
  protected resource: Resource;
  public readonly name: string;
  protected eventCallbacks: IConductorEvent;
  public latestScriptFilePath: string = ""; // パースエラー時のメッセージ用
  protected _script: Script;
  public get script(): Script {
    return this._script;
  }
  protected _status: ConductorState = ConductorState.Stop;
  public get status(): ConductorState {
    return this._status;
  }

  protected sleepStartTick: number = -1;
  protected sleepTime: number = -1;
  public sleepSender: string = "";
  protected stableBuffer: boolean = false;

  protected eventHandlers: any = {};
  protected eventHandlersStack: any[] = [];

  public latestSaveMarkName: string = "";
  public readUnread: ReadUnread;

  public constructor(resource: Resource, name: string, eventCallbacks: IConductorEvent) {
    this.resource = resource;
    this.name = name;
    this.eventCallbacks = eventCallbacks;
    this._script = new Script(this.resource, "__dummy__", ";s");
    this.readUnread = new ReadUnread(this.resource);
  }

  public async loadScript(filePath: string): Promise<void> {
    try {
      this.latestScriptFilePath = filePath;
      this._script = await this.resource.loadScript(filePath);
    } catch (e) {
      this.eventCallbacks.onError(e);
      throw e;
    }
  }

  /**
   * 指定のファイル・ラベルの位置へ移動する。
   * ラベルが省略されたときは、ファイルの先頭となる。
   * ファイルが省略されたときは、現在のファイル内でラベル移動のみ行う。
   * @param file 移動先ファイル
   * @param label 移動先ラベル
   * @param countPage 既読処理をするかどうか
   */
  public async jump(filePath: string | null, label: string | null = null, countPage = true): Promise<void> {
    if (countPage) {
      this.passLatestSaveMark();
      this.latestSaveMarkName = "";
    }
    if (filePath != null && filePath !== "") {
      await this.loadScript(filePath);
      if (label != null) {
        this.script.goToLabel(label);
      }
    } else if (label != null) {
      this.script.goToLabel(label);
    }
  }

  public isPassed(labelName: string): boolean {
    return this.readUnread.isPassed(this.script, labelName);
  }

  public isPassedLatestSaveMark(): boolean {
    return this.isPassed(this.latestSaveMarkName);
  }

  public passSaveMark(saveMarkName: string): void {
    this.readUnread.pass(this.script, saveMarkName);
  }

  public passLatestSaveMark(): void {
    this.passSaveMark(this.latestSaveMarkName);
  }

  public conduct(tick: number): void {
    if (this.status === ConductorState.Stop) {
      return;
    }

    // スリープ処理
    // スリープ中ならretur、終了していたときは後続処理へ進む
    if (this.status === ConductorState.Sleep) {
      const elapsed: number = tick - this.sleepStartTick;
      if (elapsed < this.sleepTime) {
        return;
      } else {
        this.start();
      }
    }

    this.callOnChangeStable();
    while (true) {
      let tag: Tag | null = this.script.getNextTag();
      if (tag == null) {
        this.stop();
        return;
      } else {
        tag = tag.clone();
      }

      let tagReturnValue: "continue" | "break";
      switch (tag.name) {
        case "__label__":
          tagReturnValue = this.eventCallbacks.onLabel(tag.values.__body__, tag.line, tick);
          break;
        case "__save_mark__":
          this.passLatestSaveMark();
          this.latestSaveMarkName = tag.values.name;
          tagReturnValue = this.eventCallbacks.onSaveMark(tag.values.name, tag.values.comment, tag.line, tick);
          break;
        case "__js__":
          tagReturnValue = this.eventCallbacks.onJs(tag.values.__body__, tag.values.print, tag.line, tick);
          break;
        case "__line_break__":
          if (this.resource.commandShortcut["\n"] != null) {
            tag = this.script.callCommandShortcut(tag, this.resource.commandShortcut["\n"]);
            tagReturnValue = this.eventCallbacks.onTag(tag, tag.line, tick);
          } else {
            tagReturnValue = "continue";
          }
          break;
        case "ch":
          // コマンドショートカットの反映
          if (this.resource.commandShortcut[tag.values.text] != null) {
            tag = this.script.callCommandShortcut(tag, this.resource.commandShortcut[tag.values.text]);
          }
          tagReturnValue = this.eventCallbacks.onTag(tag, tag.line, tick);
          break;
        default:
          tagReturnValue = this.eventCallbacks.onTag(tag, tag.line, tick);
          break;
      }

      if (tagReturnValue === "break") {
        break;
      }
      if (this.status !== ConductorState.Run) {
        break;
      }
    }
    this.callOnChangeStable();
  }

  private applyJsEntity(values: any): void {
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        const v: any = values[key];
        if (typeof v !== "string") {
          continue;
        }
        const value: string = ("" + v) as string;
        if (value.length >= 2 && values.charAt(0) === "&") {
          const js: string = value.substring(1);
          values[key] = this.resource.evalJs(js);
        }
      }
    }
  }

  private callOnChangeStable(): void {
    if (this.stableBuffer !== this.isStable) {
      this.eventCallbacks.onChangeStable(this.isStable);
    }
    this.stableBuffer = this.isStable;
  }

  public start(): "continue" | "break" {
    this._status = ConductorState.Run;
    this.sleepTime = -1;
    this.sleepStartTick = -1;
    this.sleepSender = "";
    // Logger.debug(`Conductor start. (${this.name})`);
    return "continue";
  }

  public stop(): "continue" | "break" {
    this._status = ConductorState.Stop;
    // Logger.debug(`Conductor stop. (${this.name})`);
    return "break";
  }

  public sleep(tick: number, sleepTime: number, sender: string): "continue" | "break" {
    this._status = ConductorState.Sleep;
    this.sleepStartTick = tick;
    this.sleepTime = sleepTime;
    this.sleepSender = sender;
    // Logger.debug(`Conductor sleep. (${this.name})`, sleepTime, sender);
    return "break";
  }

  public get isStable(): boolean {
    return (
      this._status === ConductorState.Stop &&
      !this.hasEventHandler("move") &&
      !this.hasEventHandler("trans") &&
      !this.hasEventHandler("frameanim") &&
      !this.hasEventHandler("soundstop") &&
      !this.hasEventHandler("soundfade")
    );
  }

  public addEventHandler(handler: PonEventHandler): void {
    const eventName: string = handler.eventName;
    if (this.eventHandlers[eventName] == null) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(handler);
  }

  public hasEventHandler(eventName: string): boolean {
    return this.eventHandlers[eventName] != null;
  }

  /**
   * イベントハンドラの引き金を引く
   * @param eventName イベント名
   * @return イベントハンドラが1つ以上実行されればtrue
   */
  public trigger(eventName: string): boolean {
    const handlers: PonEventHandler[] = this.eventHandlers[eventName];
    if (handlers == null) {
      return false;
    }
    this.clearEventHandlerByName(eventName);
    handlers.forEach((h) => {
      // Logger.debug("FIRE! ", eventName, h);
      h.fire();
    });
    return true;
  }

  public clearAllEventHandler(): void {
    this.eventHandlers = {};
  }

  public clearEventHandler(eventHandler: PonEventHandler): void {
    Object.keys(this.eventHandlers).forEach((eventName) => {
      this.eventHandlers[eventName].forEach((eh: PonEventHandler, index: number) => {
        if (eh === eventHandler) {
          this.eventHandlers[eventName].splice(index, 1);
          return;
        }
      });
    });
  }

  public clearEventHandlerByName(eventName: string): void {
    delete this.eventHandlers[eventName];
  }

  // public pushEventHandlers(): void {
  //   this.eventHandlersStack.push(this.eventHandlers);
  //   this.eventHandlers = {};
  // }
  //
  // public popEventHandlers(): void {
  //   if (this.eventHandlersStack.length === 0) {
  //     throw new Error("Engine Error. eventHandlerStackの不正操作");
  //   }
  //   this.eventHandlers = this.eventHandlersStack.pop();
  // }

  protected static conductorStoreParams = ["_status", "sleepStartTick", "sleepTime", "sleepSender"];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public store(saveMarkName: string, tick: number): any {
    const data: any = {};
    const me: any = this as any;

    Conductor.conductorStoreParams.forEach((param: string) => {
      data[param] = me[param];
    });

    data.scriptFilePath = this.script.filePath;
    data.saveMarkName = saveMarkName;

    // if (this.callStack.length !== 0) {
    //   throw new Error("サブルーチンの呼び出し中にセーブすることはできません");
    // }
    if (this.script.isInsideOfMacro()) {
      throw new Error("マクロの中でセーブすることはできません");
    }
    if (this.script.isInsideOfForLoop()) {
      throw new Error("for〜endforの中でセーブすることはできません");
    }
    if (this.script.isInsideOfIf()) {
      throw new Error("if〜endifの中でセーブすることはできません");
    }

    return data;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public async restore(data: any, tick: number): Promise<void> {
    const me: any = this as any;
    Conductor.conductorStoreParams.forEach((param: string) => {
      me[param] = data[param];
    });
    this.stop(); // 強制的に停止

    // script
    await this.loadScript(data.scriptFilePath);
    this.script.goToSaveMark(data.saveMarkName);
  }
  /* eslint-enabled @typescript-eslint/no-unused-vars */
}
