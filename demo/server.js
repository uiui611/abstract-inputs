const http = require('http')
const path = require('path')
const fs = require('fs')

const PORT = 3000

const server = http.createServer((req, res) => {
  try {
    const pathName = req.url
      .replace(/^\//, '')
      || 'index.html'
    console.log(`[${req.method}] ${pathName}`)

    const target = pathName.startsWith('dist/') ? path.join('__dirname', '..', pathName)
      : path.join(__dirname, pathName.replace(/^demo\//, ''))
    if (!fs.existsSync(target)) {
      res.writeHead(404, `The file '${target}' not found.`)
      res.end('<h1>404 not found</h1>')
    } else {
      const type = target.endsWith('.html') ? 'text/html'
        : target.endsWith('.js') || target.endsWith('.mjs') ? 'text/javascript'
        : target.endsWith('css') ? 'text/css'
        : 'application/octet-stream'
      res.writeHead(200, {'content-type': type})
      fs.createReadStream(target).pipe(res)
    }
  } catch (e) {
    console.error(e)
    res.writeHead(500)
    res.end('Internal Error')
  }
})

server.listen(PORT, () => console.log('Listening on http://localhost:' + PORT))
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Address localhost:${PORT} in use please retry when the port is available!`);
    server.close();
  }
});
