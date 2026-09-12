/* -------------------------------------------------------------------------- */
/*  Electron bootstrap and static asset server                                */
/* -------------------------------------------------------------------------- */
const {app, BrowserWindow} = require('electron');
const path = require('path');
const express = require('express');
const serveStatic = require('serve-static');

const STATIC_SERVER_HOST = '127.0.0.1';
const PREFERRED_STATIC_SERVER_PORT = 46239;

let httpServer;
let controlWin;

function listenStaticServer(ex, port) {
    return new Promise((resolve, reject) => {
        const server = ex.listen(port, STATIC_SERVER_HOST, () => {
            server.off('error', reject);
            const address = server.address();
            resolve({server, port: address.port});
        });

        server.once('error', reject);
    });
}

async function startStaticServer() {
    const ex = express();
    ex.use(serveStatic(path.join(__dirname, 'app'), {index: ['index.html']}));

    try {
        return await listenStaticServer(ex, PREFERRED_STATIC_SERVER_PORT);
    } catch (error) {
        if (error && error.code === 'EADDRINUSE') {
            return listenStaticServer(ex, 0);
        }

        throw error;
    }
}

async function createWindows() {
    const {server, port} = await startStaticServer();
    httpServer = server;

    controlWin = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Impro Multijoueur – Contrôle',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true,
        }
    });

    const baseUrl = `http://${STATIC_SERVER_HOST}:${port}`;
    await controlWin.loadURL(`${baseUrl}/control/control.html`);

    controlWin.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith(`${baseUrl}/projector/`)) {
            const proj = new BrowserWindow({
                width: 1200,
                height: 800,
                title: 'Impro Multijoueur – Projecteur',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    nativeWindowOpen: true,
                }
            });
            proj.loadURL(url);
            return {action: 'deny'};
        }
        return {action: 'deny'};
    });
}

app.whenReady().then(createWindows).catch(error => {
    console.error('Unable to start Paeco Impro:', error);
    app.quit();
});

app.on('window-all-closed', () => {
    if (httpServer) try {
        httpServer.close();
    } catch {
    }
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
});
