/**
 * 单端口反向代理 - 合并管理后台 + 移动端
 * 
 * 路由规则：
 *   /m/*    → 移动端前端 (localhost:5174)
 *   /api/*  → 后端API   (localhost:3000)
 *   /*      → 管理后台   (localhost:5173)
 * 
 * 启动方式: node proxy.js
 * 然后: ngrok http 8080
 */
const http = require('http');
const httpProxy = require('http-proxy');

const PORT = 8080;
const proxy = httpProxy.createProxyServer({ ws: true });

// 错误处理
proxy.on('error', (err, req, res) => {
  console.error('代理错误:', err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>502 - 后端服务未启动</h1><p>请确保三端都已运行（后端3000、管理端5173、移动端5174）</p>');
  }
});

const server = http.createServer((req, res) => {
  const url = req.url;

  if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
    // API 和上传文件 → 后端
    proxy.web(req, res, { target: 'http://localhost:3000' });
  } else if (url.startsWith('/m/') || url.startsWith('/m')) {
    // 移动端 H5
    proxy.web(req, res, { target: 'http://localhost:5174' });
  } else {
    // 管理后台
    proxy.web(req, res, { target: 'http://localhost:5173' });
  }
});

// WebSocket 支持（Vite HMR）
server.on('upgrade', (req, socket, head) => {
  const url = req.url;
  if (url.includes('5174') || req.headers.host?.includes('5174')) {
    proxy.ws(req, socket, head, { target: 'ws://localhost:5174' });
  } else {
    proxy.ws(req, socket, head, { target: 'ws://localhost:5173' });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 统一代理已启动: http://localhost:${PORT}`);
  console.log(`\n  管理后台: http://localhost:${PORT}/`);
  console.log(`  移动端H5: http://localhost:${PORT}/m/login`);
  console.log(`  后端API:  http://localhost:${PORT}/api/health`);
  console.log(`\n💡 现在运行: ngrok http ${PORT}`);
  console.log(`   把 ngrok 链接发给客户即可同时访问管理后台和移动端\n`);
});
