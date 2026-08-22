// Dev-only static server for exercise media: serves ./media/img and ./media/gif on :8888
// so the Vite proxy (/img, /gif) works without Docker. Zero dependencies.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '..', 'media')   // run from frontend/
const PORT = process.env.MEDIA_PORT || 8888
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/(img|gif)\//, '$1/')
  const file = path.join(ROOT, rel)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end('not found')
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(PORT, () => console.log(`media on :${PORT}`))
