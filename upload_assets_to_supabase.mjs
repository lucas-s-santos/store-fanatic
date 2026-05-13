import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.VITE_ASSETS_BUCKET || process.env.SUPABASE_ASSETS_BUCKET || 'jersey-images'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const ROOTS = [
  { localDir: path.resolve('public/jersey'), prefix: 'jersey' },
  { localDir: path.resolve('public/logos'), prefix: 'logos' },
]

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
      continue
    }
    files.push(fullPath)
  }

  return files
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.avif') return 'image/avif'
  return 'application/octet-stream'
}

async function uploadDirectory(localDir, prefix) {
  if (!fs.existsSync(localDir)) {
    console.warn(`Skipping missing folder: ${localDir}`)
    return { ok: 0, fail: 0 }
  }

  const files = walkFiles(localDir)
  let ok = 0
  let fail = 0

  console.log(`Uploading ${files.length} files from ${localDir} to bucket ${BUCKET}/${prefix}`)

  for (const file of files) {
    const rel = path.relative(localDir, file).split(path.sep).join('/')
    const storagePath = `${prefix}/${rel}`
    const body = fs.readFileSync(file)

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
      upsert: true,
      contentType: contentTypeFor(file),
      cacheControl: '31536000',
    })

    if (error) {
      fail += 1
      console.error(`FAIL ${storagePath}: ${error.message}`)
    } else {
      ok += 1
      if (ok % 200 === 0) {
        console.log(`Progress: ${ok}/${files.length}`)
      }
    }
  }

  return { ok, fail }
}

async function main() {
  const started = Date.now()

  let totalOk = 0
  let totalFail = 0

  for (const root of ROOTS) {
    const result = await uploadDirectory(root.localDir, root.prefix)
    totalOk += result.ok
    totalFail += result.fail
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`Done in ${seconds}s. Uploaded: ${totalOk}, Failed: ${totalFail}`)

  if (totalFail > 0) {
    process.exit(2)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
