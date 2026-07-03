import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('release waveform tools are resolved beside the packaged executable', async () => {
  const source = await readFile(
    new URL('../src-tauri/src/commands/waveform.rs', import.meta.url),
    'utf8',
  )

  assert.match(source, /current_exe\(\)/)
  assert.match(source, /std::env::consts::EXE_SUFFIX/)
})
