const {app, BrowserWindow} = require('electron');
const path = require('path');
const express = require('express');
const serveStatic = require('serve-static');

let httpServer;
let controlWin;

function startStaticServer() {
    return new Promise(resolve => {
        const ex = express();
        ex.use(serveStatic(path.join(__dirname, 'app'), {index: ['index.html']}));
        const server = ex.listen(0, '127.0.0.1', () => {
            const {port} = server.address();
            resolve({server, port});
        });
    });
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
            nativeWindowOpen: true, // permet window.open
        }
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    await controlWin.loadURL(`${baseUrl}/control/control.html`);

    // Intercepte window.open pour ouvrir le projecteur en nouvelle fenêtre
    controlWin.webContents.setWindowOpenHandler(({url}) => {
        // n'autorise que notre projecteur
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
            return {action: 'deny'}; // on gère nous-mêmes l'ouverture
        }
        return {action: 'deny'};
    });
}

app.whenReady().then(createWindows);

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
