キーボード入力を一度バッファし、特定のフレーム処理時に正規化して解決します。
また、各キーの押下状態を記録し、任意のタイミングで確認したり、直近の入力履歴を確認します。

ゲームのように特定のメッセージループ内で入力を正規化して処理したい場合に活用できます。

## 使い方
(npm を利用する場合)
```cmd
npm install --save @mizu-mizu/abstract-inputs
```
```js
import { InputManager } from '@mizu-mizu/abstract-inputs'
const FPS = 1000 / 60
const inputManager = new InputManager()

document.addEventListener('DOMContentLoaded', () => {
  inputManager.mount(document.body)
  let frameCount = 0
  setInterval(() => {
    const keyState = inputManager.consume(frameCount++)
    console.log(keyState)
  }, FPS)
  window.addEventListener('blur', () => {
    inputManager.addResetInputs()
  })
})
```

InputManager を利用する上で大事なことは、 `mount()` で要素に紐づけることと、
一定終期で `consume()` を呼び出し続けることです。

これにより、InputManager インスタンスは入力イベントの監視を開始し、`consume()` 呼び出しのタイミングで
整理します。

## API ドキュメント

### InputManager#mount()
指定した要素にキーボードリスナを登録し、キーボード入力の受付を開始します。

```js
const inputManager = new InputManager()
inputManager.mount(document.getElementById('targetEl'))
```

### InputManager#unmount()
`#mount()` で監視を開始済みの対象要素に登録されたキーボードリスナを削除し、
キー入力受付を終了します。
```js
inputManager.unmount(document.getElementById('targetEl'))
```

### InputManager#consume()
呼び出し毎に、前回呼び出し（初回の場合は `mount()`）以降に蓄積された入力をその呼び出し時点の
フレーム内入力として整理します。

常にこのメソッドを一定間隔で呼び出すようにしてください。
```js
const inputManager = new InputManager()
inputManager.mount(document.getElementById('targetEl'))
setInterval(() => {
  const keyState = inputManager.consume(frameCount++)
}, 1)
```

### InputManager#reserve()
キー入力を指定フレーム番号で解決される入力として予約します。

キーを押し下げた入力を `type: 'down'` とし、キーを離す入力を `type: 'up'` として予約する必要があります。

```js
const inputManager = new InputManager()
inputManager.reserve(1000, [{
  type: 'down',
  code: 'KeyA',
}])
inputManager.reserve(1001, [{
  type: 'up',
  code: 'KeyA',
}])
```

### tokenize(), parseTokens()
指定されたフォーマットのコマンド文字列をトークン列に展開/トークン列からコマンドデータを作成します。

いずれの関数も、async iterable なオブジェクトを返します。

parseTokens() は、引数に配列と async iterable なオブジェクトのいずれも受け取ることができます。
```js
import { tokenize, parseTokens } from '@mizu-mizu/abstract-inputs'
const text = '1000:dKeyA 1001:uKeyA'
for await (const { frameCount, inputEvents } of parseTokens(tokenize(value))) {
  inputManager.reserve(frameCount, inputEvents)
}
```

### tokenizeSync()
この関数は、tokenize() の同期版です。コマンド文字列を引数に受け取り、トークンオブジェクトの配列を返します。

第二引数を省略した場合、与えられた入力は line:0, column:0 から始まるものとして処理されますが、
第二引数の指定によりこの値を変更することが出来ます。

```js
import { tokenizeSync } from '@mizu-mizu/abstract-inputs'
const text = '1000:dKeyA'
console.log(tokenizeSync(text, { lineNoFrom: 2, columnNoFrom: 3 }))
  // -> [
  //   { lineNo: 2, column: 3, text: '1000' },
  //   { lineNo: 2, column: 7, text: ':' },
  //   { lineNo: 2, column: 8, text: 'dKeyA' }
  // ]
```
