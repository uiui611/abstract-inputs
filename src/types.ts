/**
 * ゲームが解釈するキーの入力内容を格納する。
 */
export interface KeyInputEvent {
  type: 'down' | 'up';
  code: string;
}
/**
 * あるフレームの入力内容・状態を保存する。
 */
export interface KeyState {
  /**
   * この状態が記録された際のフレーム番号
   */
  frameCount: number;
  /**
   * このフレーム内にあった入力ログ
   */
  inputEvents: Readonly<KeyInputEvent[]>;
  /**
   * 押下状態にあるキーのキーコードをキーとし、キーを押下した際のフレーム番号を
   * 値に持つマップオブジェクト。押下状態に無いキーのキーコードは含まれない。
   */
  downKeys: Readonly<Map<string, number>>;
}
/**
 * パーサーが解析する入力データ文字列を意味単位で分割したトークン。
 */
export interface Token {
  /**
   * このトークンが出現した行番号（ 0 オフセット )
   */
  lineNo: number;
  /**
   * このトークンが出現した行内の市 ( 0 オフセット)
   */
  column: number;
  /**
   * このトークンの文字列内容
   */
  text: string;
}
