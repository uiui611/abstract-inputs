import {KeyInputEvent, KeyState} from './types'
import {createKeyboardListeners} from './create-keyboard-listeners'

const INPUT_EVENT_DUMMY_REMOVED:KeyInputEvent = Object.freeze({
  type: 'up',
  code: '__removed',
})

/**
 * キー入力を離散化して管理する。
 */
export default class InputManager {
  #eventContainer: KeyInputEvent[] = []
  #keyboardListeners: ReturnType<typeof createKeyboardListeners>
  #keyStateLogMaxSize = 16
  #reservedInputs: Map<number, KeyInputEvent[]> = new Map()
  /**
   * キーの直近フレームの入力履歴を示すオブジェクト。
   */
  keyStateLog: KeyState[] = []

  /**
   * キー入力状態ログを保持する {@link KeyState} を保持する最大数。
   *
   * 最低でも直前 keyStateLogMaxSize フレームのキー入力状態が保持される。
   *
   * キー入力が無いフレームの {@link KeyState} オブジェクトは記録されないため、
   * より前のフレームの入力状態を保持する場合もある。
   */
  get keyStateLogMaxSize() {
    return this.#keyStateLogMaxSize
  }
  set keyStateLogMaxSize(value: number) {
    if (value <= 0) {
      throw new Error('キーログの最大数は整数を指定してください')
    }
    this.#keyStateLogMaxSize = value
    if (this.keyStateLog.length > value) {
      this.keyStateLog.splice(0, this.keyStateLog.length - value)
    }
  }
  constructor() {
    this.#keyboardListeners = createKeyboardListeners(this.#eventContainer)
  }

  /**
   * 要素にマウントし、要素が受け取るキー入力の管理を開始する。
   *
   * ```
   * inputManager.mount(document.body)
   * ```
   * @param el キー入力イベントを発行する要素
   */
  mount(el: { addEventListener : typeof addEventListener }) {
    this.#keyboardListeners.mount(el)
  }

  /**
   * マウントした要素に登録していたイベントリスナの登録を解除する。
   * @param el マウント済みの要素
   * @see #mount
   */
  unmount(el: { removeEventListener: typeof removeEventListener }) {
    this.#keyboardListeners.unmount(el)
  }
  #computeKeyState(frameCount: number): KeyState {
    const lastKeyState = this.keyStateLog[this.keyStateLog.length - 1] || { inputEvents: [], downKeys: new Map() }
    const inputEvents = [... this.#eventContainer]
    inputEvents.push(...(this.#reservedInputs.get(frameCount) || []))
    const downKeys = new Map<string, number>(lastKeyState.downKeys)
    for (let i = 0; i < inputEvents.length; i++) {
      const ev = inputEvents[i]
      if (ev.type === 'up') {
        if (downKeys.has(ev.code)) {
          downKeys.delete(ev.code)
        } else {
          inputEvents[i] = INPUT_EVENT_DUMMY_REMOVED
        }
      } else if (ev.type === 'down') {
        if (downKeys.has(ev.code)) {
          inputEvents[i] = INPUT_EVENT_DUMMY_REMOVED
        } else {
          downKeys.set(ev.code, frameCount)
        }
      }
    }
    return Object.freeze({
      frameCount,
      inputEvents: Object.freeze(inputEvents.filter(ev => ev !== INPUT_EVENT_DUMMY_REMOVED)),
      downKeys: Object.freeze(downKeys)
    })
  }

  /**
   * 指定したフレームに入力を予約する。
   *
   * 予約したフレームに到達した際、そのフレームの末尾に与えられた入力列が追加される。
   *
   * 既に同一フレームに入力が予約されている場合、与えられた入力列は既存の予約入力列の末尾に追加で
   * 予約される。
   *
   * ここで指定した内容は HTML 要素が発生させる入力イベントと同様に扱われる。
   * @param frameCount 入力を発生させる予約フレーム番号
   * @param frameInputs 入力内容
   */
  reserve(frameCount: number, frameInputs: KeyInputEvent[]) {
    const inputs = this.#reservedInputs.get(frameCount) || []
    inputs.push(...frameInputs)
    this.#reservedInputs.set(frameCount, inputs)
  }

  /**
   * 現在の入力状態をリセットするようなキーアップ入力を現在実行中のフレーム内の入力に追加する。
   *
   * リセット入力を処理した後、全てのキーの押下状態が解除される。
   *
   * e.g.
   * ```
   * window.addEventListener('blur', ev => {
   *   inputManager.addResetInputs()
   * })
   * ```
   */
  addResetInputs() {
    const keyState = this.#computeKeyState(-1)
    ;[...keyState.downKeys.keys()]
      .forEach(code => {
        const ev: KeyInputEvent = Object.freeze({
          type: 'up',
          code
        })
        this.#eventContainer.push(ev)
      })
  }

  /**
   * 入力バッファに格納された入力を指定したフレーム番号内の入力として消費し、現在の押下状態に反映させる。
   *
   * @param frameCount フレーム番号
   * @return 消費したキーの入力状態を保持するオブジェクト
   */
  consume(frameCount: number) : KeyState {
    const result = this.#computeKeyState(frameCount)
    if (!result.inputEvents.length) {
      return Object.freeze({
        frameCount,
        inputEvents: Object.freeze([]),
        downKeys: this.keyStateLog[this.keyStateLog.length - 1]?.downKeys || new Map()
      })
    }
    this.keyStateLog.push(result)
    if (this.keyStateLog.length > this.keyStateLogMaxSize) {
      this.keyStateLog.splice(0, this.keyStateLog.length - this.keyStateLogMaxSize)
    }
    this.#eventContainer.length = 0
    return result
  }
}
