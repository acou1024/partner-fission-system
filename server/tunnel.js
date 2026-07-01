/**
 * 内网穿透隧道脚本
 * 使用 localtunnel 将本地 8080 端口暴露到公网
 * 启动方式: node tunnel.js
 */
const localtunnel = require('localtunnel');

async function startTunnel() {
    try {
        const tunnel = await localtunnel({ port: 8080 });
        console.log('\n🌐 内网穿透已启动!');
        console.log(`\n  公网地址: ${tunnel.url}`);
        console.log(`  管理后台: ${tunnel.url}/`);
        console.log(`  移动端H5: ${tunnel.url}/m/login`);
        console.log(`  后端API:  ${tunnel.url}/api/health`);
        console.log('\n💡 把上面的公网地址发给客户即可访问\n');

        tunnel.on('close', () => {
            console.log('隧道已关闭，5秒后重连...');
            setTimeout(startTunnel, 5000);
        });

        tunnel.on('error', (err) => {
            console.error('隧道错误:', err);
        });

        process.on('SIGINT', () => {
            tunnel.close();
            process.exit(0);
        });
    } catch (err) {
        console.error('启动隧道失败:', err.message, '，5秒后重试...');
        setTimeout(startTunnel, 5000);
    }
}

startTunnel();

// 保持进程运行
setInterval(() => { }, 1000 * 60);
