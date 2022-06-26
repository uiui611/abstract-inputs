import {parseTokens, toCommandString, tokenize, tokenizeSync} from './parser'

describe('parser', () => {
  test('parseTokens() should parse single key input', async () => {
    const res = []
    for await (const f of parseTokens([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 0, text: ':' },
      { lineNo: 0, column: 0, text: 'dKeyA' },
    ])) {
      res.push(f)
    }
    expect(res).toStrictEqual([{ frameCount: 10, inputEvents: [ { type: 'down', code: 'KeyA' } ]}])
  })
  test('parseTokens() should be possible to get two or more codes in a frame', async () => {
    const res = []
    for await (const f of parseTokens([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 0, text: ':' },
      { lineNo: 0, column: 0, text: 'dKeyA' },
      { lineNo: 0, column: 0, text: 'dKeyB' },
    ])) {
      res.push(f)
    }
    expect(res).toStrictEqual([
      { frameCount: 10, inputEvents: [
        { type: 'down', code: 'KeyA' },
        { type: 'down', code: 'KeyB' }
      ]}
    ])
  })
  test('parseTokens() should be possible to parse for two or more frame', async () => {
    const res = []
    for await (const f of parseTokens([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 0, text: ':' },
      { lineNo: 0, column: 0, text: 'dKeyA' },
      { lineNo: 0, column: 0, text: '11' },
      { lineNo: 0, column: 0, text: ':' },
      { lineNo: 0, column: 0, text: 'dKeyB' },
    ])) {
      res.push(f)
    }
    expect(res).toStrictEqual([
      { frameCount: 10, inputEvents: [ { type: 'down', code: 'KeyA' } ]},
      { frameCount: 11, inputEvents: [ { type: 'down', code: 'KeyB' } ]},
    ])
  })
  test('parseTokens() should be possible to parse keyup', async () => {
    const res = []
    for await (const f of parseTokens([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 0, text: ':' },
      { lineNo: 0, column: 0, text: 'uKeyA' },
    ])) {
      res.push(f)
    }
    expect(res).toStrictEqual([
      { frameCount: 10, inputEvents: [ { type: 'up', code: 'KeyA' } ]}
    ])
  })

  test('tokenizeSync() should return single number token', () => {
    const res = tokenizeSync('10')
    expect(res).toStrictEqual([{ lineNo: 0, column: 0, text: '10' }])
  })
  test('tokenizeSync() should return single word token', () => {
    const res = tokenizeSync('ab10')
    expect(res).toStrictEqual([{ lineNo: 0, column: 0, text: 'ab10' }])
  })
  test('tokenizeSync() should split number token and ":"', () => {
    const res = tokenizeSync('10:')
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 2, text: ':' },
    ])
  })
  test('tokenizeSync() should update line and column number after line break', () => {
    const res = tokenizeSync('10\n:')
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 1, column: 0, text: ':' },
    ])
  })
  test('tokenizeSync() should parse multiple keys correct', () => {
    const res = tokenizeSync('KeyA KeyB')
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: 'KeyA' },
      { lineNo: 0, column: 5, text: 'KeyB' },
    ])
  })
  test('tokenizeSync() should skip space ', () => {
    const res = tokenizeSync('10 :')
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 3, text: ':' },
    ])
  })

  test('tokenize() should return single token from single input', async () => {
    const res = []
    for await (const t of tokenize((async function*() { yield 'first' })())) {
      res.push(t)
    }
    expect(res).toStrictEqual([{ lineNo: 0, column: 0, text: 'first' }])
  })
  test('tokenize() should return single token from split input', async () => {
    const res = []
    for await (const t of tokenize((async function*() { yield 'fir'; yield 'st' })())) {
      res.push(t)
    }
    expect(res).toStrictEqual([ { lineNo: 0, column: 0, text: 'first' } ])
  })
  test('tokenize() should return some tokens on a frame', async () => {
    const res = []
    for await (const t of tokenize((async function*() { yield '10:dKe'; yield 'yA '; yield 'dKeyB' })())) {
      res.push(t)
    }
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 2, text: ':' },
      { lineNo: 0, column: 3, text: 'dKeyA' },
      { lineNo: 0, column: 9, text: 'dKeyB' },
    ])
  })
  test('tokenize() should return for each frame', async () => {
    const res = []
    for await (const t of tokenize((async function*() {
      yield '10:dKeyA '
      yield 'dKeyB '
      yield '11:dKeyC'
    })())) {
      res.push(t)
    }
    expect(res).toStrictEqual([
      { lineNo: 0, column: 0, text: '10' },
      { lineNo: 0, column: 2, text: ':' },
      { lineNo: 0, column: 3, text: 'dKeyA' },
      { lineNo: 0, column: 9, text: 'dKeyB' },
      { lineNo: 0, column: 15, text: '11' },
      { lineNo: 0, column: 17, text: ':' },
      { lineNo: 0, column: 18, text: 'dKeyC' },
    ])
  })

  test('toCommandString() should return valid command string for single down key', () => {
    const res = toCommandString({
      frameCount: 10,
      inputEvents: [
        { type: 'down', code: 'KeyTEST' }
      ],
      downKeys: new Map()
    })
    expect(res).toBe('10:dKeyTEST')
  })
  test('toCommandString() should return valid command string for multi keys', () => {
    const res = toCommandString({
      frameCount: 10,
      inputEvents: [
        { type: 'down', code: 'KeyTEST' },
        { type: 'down', code: 'KeyTEST2' },
      ],
      downKeys: new Map()
    })
    expect(res).toBe('10:dKeyTEST dKeyTEST2')
  })
  test('toCommandString() should return valid command string for up keys', () => {
    const res = toCommandString({
      frameCount: 10,
      inputEvents: [
        { type: 'up', code: 'KeyTEST' },
      ],
      downKeys: new Map()
    })
    expect(res).toBe('10:uKeyTEST')
  })
})
