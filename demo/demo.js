import { InputManager } from '../dist/abstract-inputs.mjs'
import { parseTokens, tokenize } from '../dist/abstract-inputs.mjs'
console.debug('hello demo')

const inputManager = new InputManager()

/**
 * 要素リストを与えられたデータに応じて更新する。
 *
 * データは常に一定の規則でソート済みで、固有のキーを持つ必要がある。
 * @param parent 子要素を設定する親要素
 * @param newData 新しいソート済みのデータ列
 * @param keyGenerator データから固有のキーを取得する関数
 * @param generator データから HTML 要素を生成する関数
 */
function patch(parent, newData, keyGenerator, generator) {
  const oldElements = [...parent.children]
  const oldKeys = oldElements.map(el => el.dataset.key || '').filter(s => s.length)
  const oldKeySet = new Set(oldKeys)
  const newKeys = newData.map(keyGenerator)
  const commonKeySet = new Set(newKeys.filter(k => oldKeySet.has(k)))
  /*
   * remove unnecessary keys
   */
  oldElements
    .filter(el => !commonKeySet.has(el.dataset.key || ''))
    .forEach(el => {
      parent.removeChild(el)
    })
  /*
   * insert new items
   */
  for(let i=0; i<newKeys.length; i++) {
    const key = newKeys[i]
    const data = newData[i]
    if (commonKeySet.has(key)) continue
    const node = generator(data)
    parent.insertBefore(node, parent.children[i] || null)
  }
}

/*
 * 押下中のキー一覧表示リストを更新する
 */
function updateDownKeys(keys) {
  const downKeyUl = document.getElementById('down-keys')
  if (!downKeyUl) return
  patch(downKeyUl, keys.sort(), k => k, k => {
    const el = document.createElement('li')
    el.dataset.key = k
    el.innerText = k
    return el
  })
}

/*
 * 入力ログリストを更新する
 */
function updateInputLog(keyStateLog) {
  const inputLogsOl = document.getElementById('input-logs')
  if (!inputLogsOl) return
  patch(inputLogsOl, [...keyStateLog].reverse(), ks => `${ks.frameCount}`, log => {
    const el = document.createElement('li')
    el.dataset.key = `${log.frameCount}`
    const frameCountEl = document.createElement('span')
    frameCountEl.innerText = `${log.frameCount}`
    frameCountEl.classList.add('frame-count')
    const inputsEl = document.createElement('span')
    inputsEl.innerText = log.inputEvents.map(ev => `(${ev.type})${ev.code}`).join(', ')
    el.appendChild(frameCountEl)
    el.appendChild(inputsEl)
    return el
  })
}

document.addEventListener('DOMContentLoaded', () => {
  inputManager.mount(document.body)
  let frameCount = 0
  setInterval(() => {
    const keyState = inputManager.consume(frameCount++)
    updateDownKeys([...keyState.downKeys.keys()])
    updateInputLog(inputManager.keyStateLog)
  }, 1000 / 60)
  document.body.addEventListener('keydown', ev => {
    console.debug({ type: 'down', code: ev.code })
  })
  document.body.addEventListener('keyup', ev => {
    console.debug({ type: 'up', code: ev.code })
  })
  window.addEventListener('blur', () => {
    inputManager.addResetInputs()
  })
  {
    /*
     * Reserve single command for one sec.
     */
    const keyNameInput = document.getElementById('key-name-input')
    const reserveButton = document.getElementById('reserve-button')
    if (keyNameInput && reserveButton) {
      reserveButton.addEventListener('click', () => {
        const code = keyNameInput.value
        const downFrame = frameCount + 60
        console.debug(downFrame, code)
        inputManager.reserve(downFrame, [{
          type: 'down',
          code,
        }])
        inputManager.reserve(downFrame + 10, [{
          type: 'up',
          code,
        }])
      })
    }
  }
  {
    /*
     * parse command and reserve on 1 sec
     */
    const commandTextArea = document.getElementById('commands-input')
    const reserveButton = document.getElementById('commit-commands-button')
    if(commandTextArea && reserveButton) {
      reserveButton.addEventListener('click', async () => {
        const value = commandTextArea.value
        const baseFrame = frameCount + 60
        for await (const { frameCount, inputEvents } of parseTokens(tokenize(value))) {
          inputManager.reserve(frameCount + baseFrame, inputEvents)
        }
      })
    }
  }
})
