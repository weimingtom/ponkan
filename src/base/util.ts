  /**
   * 色を "rgb(r,g,b)" の文字列に変換する
   * @param color 色
   */
export function toRgb (color: number | string): string {
  let r: number = 0
  let g: number = 0
  let b: number  = 0
  switch (typeof color) {
    case 'string':
      r = +('0x' + ((<string> color).substr(1, 2)));
      g = +('0x' + ((<string> color).substr(3, 2)));
      b = +('0x' + ((<string> color).substr(5, 2)));
      break;
    case 'number':
      r = Math.floor(((<number> color) & 0xff0000) / 0x10000)
      g = Math.floor(((<number> color) & 0x00ff00) / 0x100)
      b = Math.floor((<number> color) & 0x0000ff)
      break;
  }
  return `rgb(${r},${g},${b})`
}

/**
 * オブジェクトを拡張する
 * @param base 拡張先オブジェクト
 * @param obj 拡張元オブジェクト
 * @return オブジェクト
 */
export function objExtend (base: any, obj: any): any {
  Object.keys(obj).forEach((key) => {
    base[key] = obj[key];
  })
  return base;
}

/**
 * オブジェクトを複製する（シャローコピー）
 * @param obj 複製するオブジェクト
 * @return 複製のオブジェクト
 */
export function objClone (obj: any): any {
  let base: any = {}
  Object.keys(obj).forEach((key) => {
    base[key] = obj[key];
  });
  return base;
}

/**
 * 文字列中のHTMLをエスケープする
 * @param html HTML文字列
 * @return エスケープされた文字列
 */
export function escapeHtml (html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}




