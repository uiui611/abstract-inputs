import {KeyInputEvent, KeyState, Token} from './types'

class TokenStream {
  #tokens: AsyncIterator<Token> | Iterator<Token>
  #currentValue: Token | null
  lastValue: Token | null = null
  constructor(tokens: AsyncIterator<Token> | Iterator<Token>, firstToken: Token | null) {
    this.#tokens = tokens
    this.#currentValue = firstToken
  }

  /**
   * 次のトークンを取得する。
   * トークンは消費せず、次の {@link #token()} 又は {@link #next()} 呼び出しでも同じトークンが返される。
   */
  token() : Token | null {
    return this.#currentValue
  }

  /**
   * 現在のトークンを取得し、ストリームを読み進める。
   *
   * このメソッドの返却値が lastValue プロパティにセットされる。
   */
  async next(): Promise<Token | null> {
    const res = this.lastValue = this.#currentValue
    if (res) {
      const iteratorRes = await this.#tokens.next()
      this.#currentValue = (iteratorRes.done) ? null : iteratorRes.value
    }
    return res
  }
}

/**
 * キー入力列を表現したテキストを {@link parseTokens}() 関数が解析可能なトークン列に変換する。
 *
 * この関数は与えられた入力列全体をすぐさま解析して結果を返す。
 *
 * 非同期に与えられる入力列を逐次処理する場合は {@link tokenize}() を利用する。
 *
 * @param input 入力文字列
 * @param lineNoFrom 入力列最初の文字の行番号
 * @param columnFrom 入力列最初の文字の列番号
 * @return 分割されたトークン列
 * @see parseTokens
 */
export function tokenizeSync(input: string, { lineNoFrom = 0, columnFrom = 0 } = {}): Token[] {
  let index = 0,
    lineNo = lineNoFrom,
    columnNo = columnFrom
  const res = []
  while (index < input.length) {
    let ch = input.charAt(index)
    if (/\n/.test(ch)) {
      // line break
      lineNo++
      columnNo = -1
    } else if (/\s/.test(ch)) {
      // white space
    } else if (':' === ch){
      // colon
      res.push({ lineNo, column: columnNo, text: ch })
    } else {
      const regex = [/\d/, /[\d\w]/]
        .find(r => r.test(ch))
      if (!regex) {
        throw new Error(`(line: ${lineNo}, column: ${columnNo}) 不明な文字 > コード:${ch.charCodeAt(0)} '${ch}'`)
      }
      // number or word token
      const from = index
      let to = index
      while(to < input.length && regex.test(input.charAt(to))) to++
      index = to - 1
      res.push({ lineNo, column: columnNo, text: input.substring(from, to) })
      columnNo += to - from - 1
    }
    columnNo++
    index++
  }
  return res
}

/**
 * キー入力列を表現したテキストストリームを逐次解析し、 {@link parseTokens}() 関数が解析可能なトークン列に変換する。
 * @param input 入力列又は入力文字列を順次解決する AsyncIterable
 * @return 分割されたトークン列を解決する非同期イテレータ
 * @see parseTokens
 */
export async function* tokenize(input: AsyncIterable<string> | string): AsyncIterable<Token> {
  let lastIsSpace = false
  let strBuffer = ''
  let lineNoFrom = 0
  let columnFrom = 0
  for await (const str of (typeof input === 'string' ? [input] : input)) {
    for (const ch of str.split('')) {
      const isNumber = /\d/.test(ch)
      if (lastIsSpace && isNumber) {
        const res = tokenizeSync(strBuffer, { lineNoFrom, columnFrom })
        if (res && res.length) yield* res
        for (const ch of strBuffer) {
          if (/\n/.test(ch)) {
            lineNoFrom++
            columnFrom=0
          } else {
            columnFrom++
          }
        }
        strBuffer = ''
      }
      lastIsSpace = /[\n\s]/.test(ch)
      strBuffer += ch
    }
  }
  const res = tokenizeSync(strBuffer, { lineNoFrom, columnFrom })
  if (res && res.length) yield* res
}

/**
 * キー入力列を表現したトークン列を順次処理し、フレーム毎の入力処理列データを解決する。
 *
 * キー入力列は以下の文法規則を持つ文字列を {@link tokenizeSync}() または {@link tokenize}() により
 * 分割したトークン列として与えられる。
 * @param tokens トークン列
 */
export async function* parseTokens(tokens: AsyncIterable<Token> | Token[]): AsyncIterable<{ frameCount: number, inputEvents: KeyInputEvent[] }> {
  const iterator = Array.isArray(tokens) ? tokens.values() : tokens[Symbol.asyncIterator]()
  const itRes = await iterator.next()
  const tokenStream = new TokenStream(iterator, itRes.done ? null : itRes.value)
  while (tokenStream.token()) {
    yield await frameState(tokenStream)
  }
}

/**
 * 与えられた文字列が KeyCode に利用可能か判定し、不適な場合はエラーをスローする。
 * @param codeName 検証する文字列
 */
export function validateCodeName(codeName: string) {
  if (!/^[a-zA-Z_]\w*$/.test(codeName)) {
    throw new Error('KeyCode は ^[a-zA-Z_]\\w*$ のパターンに合致させてください ')
  }
}

/**
 * 与えられたキーステートを {@link parseTokens}() で解析可能な文字列にフォーマットする。
 * @param keyState 変換する文字列
 * @return コマンド文字列
 */
export function toCommandString(keyState: KeyState): string {
  keyState.inputEvents.forEach(ev => validateCodeName(ev.code))
  const keys = keyState.inputEvents.map(ev => ev.type.slice(0, 1) + ev.code).join(' ')
  return `${keyState.frameCount}:${keys}`
}

async function frameState(tokens: TokenStream): Promise<{ frameCount: number, inputEvents: KeyInputEvent[] }> {
  const frame = await frameCount(tokens)
  const inputs: KeyInputEvent[] = []
  await fixedText(tokens, ':')
  while(tokens.token() && !/^\d+$/.test(tokens.token()?.text || '')) {
    const token = (await tokens.next())!
    const input = token.text
    const typeCh = input.charAt(0)
    const type = typeCh === 'u' ? 'up'
        : typeCh === 'd' ? 'down'
        : null
    if (!type) {
      throw new Error(`(line: ${token.lineNo}, column: ${token.column}) 入力種別 ('u'|'d') が必要です > ${typeCh}`)
    }
    const keyCode = input.substring(1)
    if (!keyCode) {
      throw new Error(`(line: ${token.lineNo}, column: ${token.column + 1}) キーコード種別が必要です > ${input}`)
    }
    inputs.push({
      type,
      code: keyCode
    })
  }
  return { frameCount: frame, inputEvents: inputs }
}

async function frameCount(tokens: TokenStream): Promise<number> {
  const next = await tokens.next()
  if (next) {
    if (!/^[0-9]+$/.test(next.text)) {
      throw new Error(`(line: ${next.lineNo}, column: ${next.column}) フレーム番号が必要です > ${next.text}`)
    }
    const res = parseInt(next.text)
    if (isNaN(res)) {
      throw new Error(`(line: ${next.lineNo}, column: ${next.column}) 数値の解析に失敗しました > ${next.text}`)
    }
    return res
  } else {
    throw new Error('フレーム番号が必要ですが、入力の終端に到達しました。')
  }
}

async function fixedText(tokens: TokenStream, requiredText: string): Promise<void> {
  const next = await tokens.next()
  if (next) {
    if (next.text !== requiredText) {
      throw new Error(`(line: ${next.lineNo}, column: ${next.column}) 文字列 '${requiredText}' が必要です > ${next.text}`)
    }
  } else {
    const last = tokens.lastValue || { lineNo: 0, column: 0, text: '' }
    throw new Error(`(line: ${last.lineNo}, column: ${last.column + last.text.length}) 文字列'${requiredText}'`
      + `が必要ですが、入力の終端に到達しました。`)
  }
}
