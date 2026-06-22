import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const standaloneDir = join('.next', 'standalone')
const standaloneNextDir = join(standaloneDir, '.next')

if (!existsSync(standaloneDir)) {
  throw new Error('Standalone build directory not found. Run next build first.')
}

cpSync(join('.next', 'static'), join(standaloneNextDir, 'static'), {
  recursive: true,
  force: true,
})

cpSync('public', join(standaloneDir, 'public'), {
  recursive: true,
  force: true,
})
