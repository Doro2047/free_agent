// 将 dist-electron 目录中的 .js 和 .js.map 文件重命名为 .cjs 和 .cjs.map
// 解决 ESM/CommonJS 模块冲突问题

import { readdir, rename, stat } from 'fs/promises'
import { join } from 'path'

const DIST_ELECTRON_DIR = new URL('../dist-electron', import.meta.url)

async function renameJsToCjs() {
  try {
    const files = await readdir(DIST_ELECTRON_DIR)
    
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.js.map')) {
        const oldPath = join(DIST_ELECTRON_DIR, file)
        const stats = await stat(oldPath)
        
        if (stats.isFile()) {
          const newName = file.endsWith('.js.map')
            ? file.replace('.js.map', '.cjs.map')
            : file.replace('.js', '.cjs')
          
          const newPath = join(DIST_ELECTRON_DIR, newName)
          await rename(oldPath, newPath)
          console.log(`Renamed: ${file} -> ${newName}`)
        }
      }
    }
    
    console.log('Successfully renamed all .js files to .cjs in dist-electron/')
  } catch (error) {
    console.error('Error renaming files:', error)
    process.exit(1)
  }
}

renameJsToCjs()
