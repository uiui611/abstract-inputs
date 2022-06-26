/*
 * キーボード入力の各種 DOM イベントを処理するメソッド群。
 * 各メソッドは対応する Input インスタンスが this に結合された状態で呼び出される。
 */
import {KeyInputEvent} from './types'

const keyboardListeners = Object.freeze({
  keyup (container: KeyInputEvent[], ev: KeyboardEvent) {
    container.push({
      type: 'up',
      code: ev.code,
    })
  },
  keydown (container: KeyInputEvent[], ev: KeyboardEvent) {
    container.push({
      type: 'down',
      code: ev.code
    })
  }
})

/**
 * ユーザーからのキーボード入力を受け取るコールバックを作成する。
 * この関数が生成するコールバックは、KeyboardEvent を発生させる
 * 要素のマウント、アンマウント時に呼び出されることが期待される。
 *
 * コールバックが受け取った入力は {@link KeyInputEvent} に変換され、
 * 与えられた配列の末尾に追加される。
 *
 * この関数は引数で受け取った配列に **破壊的な変更を加える** 。
 *
 * @internal
 * @param eventsContainer 受け取った入力データを格納する配列
 */
export function createKeyboardListeners (eventsContainer: KeyInputEvent[]) {
  const listeners = Object.entries(keyboardListeners)
    .map(([name, listener]) => ({
      name: name as (keyof typeof keyboardListeners),
      listener: (ev: KeyboardEvent) => listener(eventsContainer, ev)
    }))
  return {
    mount (el: { addEventListener: typeof addEventListener }) {
      listeners.forEach(({ name, listener }) => {
        el.addEventListener(name, listener)
      })
    },
    unmount (el: { removeEventListener: typeof removeEventListener }) {
      listeners.forEach(({ name, listener }) => {
        el.removeEventListener(name, listener)
      })
    }
  }
}
