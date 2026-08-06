const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
};

var server = http.createServer(function(req, res) {
    try {
        var urlPath = decodeURIComponent(req.url.split('?')[0]);
        var filePath = path.join(ROOT, urlPath);
        if (filePath === ROOT || req.url === '/') {
            filePath = path.join(ROOT, 'index.html');
        }
        var ext = path.extname(filePath).toLowerCase();
        var contentType = MIME[ext] || 'application/octet-stream';

        fs.readFile(filePath, function(err, data) {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(data);
        });
    } catch (e) {
        res.writeHead(500);
        res.end('Server Error');
    }
});

server.on('error', function(err) {
    console.log('Server error:', err.message);
});

server.listen(PORT, function() {
    console.log('Server running at http://localhost:' + PORT);
});
