import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('native waveform cache follows the active Pawcast data directory', async () => {
  const source = await readFile(
    new URL('../src-tauri/src/commands/waveform.rs', import.meta.url),
    'utf8',
  )

  assert.match(source, /active_data_directory\s*\.read\(\)/)
  assert.match(source, /join\("cache"\)\s*\.join\("waveform"\)/)
  assert.doesNotMatch(source, /app_cache_dir\(\)/)
})
