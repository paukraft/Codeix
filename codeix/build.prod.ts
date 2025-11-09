import { config } from 'dotenv'
import { Template, defaultBuildLogger } from 'e2b'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { template } from './template'

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env') })

async function main() {
  await Template.build(template, {
    alias: 'codeix',
    cpuCount: 8,
    memoryMB: 4096,
    onBuildLogs: defaultBuildLogger(),
  })
}

main().catch(console.error)
