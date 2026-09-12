/* -------------------------------------------------------------------------- */
/*  Electron bootstrap and static asset server                                */
/* -------------------------------------------------------------------------- */
const {app, BrowserWindow, session} = require('electron');
const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const STATIC_SERVER_HOST = '127.0.0.1';
const PREFERRED_STATIC_SERVER_PORT = 46239;
const APP_TITLE = 'Paeco Impro';
const APP_DIR = path.join(__dirname, 'app');

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'"
].join('; ');

let httpServer;
let controlWin;
let appBaseUrl;

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.icns': 'image/icns',
    '.js': 'text/javascript; charset=utf-8',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp'
};

function createSecureWindow(options) {
    const browserWindow = new BrowserWindow({
        ...options,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            nativeWindowOpen: false,
            ...(options.webPreferences || {})
        }
    });

    secureWebContents(browserWindow.webContents);
    return browserWindow;
}

function isAllowedAppUrl(url) {
    if (!appBaseUrl) return false;

    try {
        return new URL(url).origin === appBaseUrl;
    } catch {
        return false;
    }
}

function isAllowedProjectorUrl(url) {
    if (!isAllowedAppUrl(url)) return false;

    try {
        return new URL(url).pathname.startsWith('/projector/');
    } catch {
        return false;
    }
}

function secureWebContents(webContents) {
    webContents.on('will-navigate', event => {
        event.preventDefault();
    });

    webContents.setWindowOpenHandler(({url}) => {
        if (isAllowedProjectorUrl(url)) {
            const projectorWin = createSecureWindow({
                width: 1200,
                height: 800,
                title: `${APP_TITLE} - Projecteur`
            });

            projectorWin.loadURL(url).catch(error => {
                console.error('Unable to load projector window:', error);
                projectorWin.close();
            });

            return {action: 'deny'};
        }

        return {action: 'deny'};
    });
}

function configureSessionSecurity() {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
                'X-Content-Type-Options': ['nosniff']
            }
        });
    });
}

function getStaticFilePath(requestUrl) {
    let pathname;

    try {
        pathname = decodeURIComponent(new URL(requestUrl, `http://${STATIC_SERVER_HOST}`).pathname);
    } catch {
        return null;
    }

    if (pathname === '/') {
        pathname = '/control/control.html';
    }

    const filePath = path.normalize(path.join(APP_DIR, pathname));
    return filePath.startsWith(APP_DIR) ? filePath : null;
}

async function handleStaticRequest(request, response) {
    const filePath = getStaticFilePath(request.url);

    if (!filePath) {
        response.writeHead(400);
        response.end('Bad request');
        return;
    }

    try {
        const data = await fs.readFile(filePath);
        response.writeHead(200, {
            'Content-Security-Policy': CONTENT_SECURITY_POLICY,
            'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff'
        });
        response.end(data);
    } catch {
        response.writeHead(404, {
            'Content-Security-Policy': CONTENT_SECURITY_POLICY,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff'
        });
        response.end('Not found');
    }
}

function listenStaticServer(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(handleStaticRequest);

        server.listen(port, STATIC_SERVER_HOST, () => {
            server.off('error', reject);
            const address = server.address();
            resolve({server, port: address.port});
        });

        server.once('error', reject);
    });
}

async function startStaticServer() {
    try {
        return await listenStaticServer(PREFERRED_STATIC_SERVER_PORT);
    } catch (error) {
        if (error && error.code === 'EADDRINUSE') {
            return listenStaticServer(0);
        }

        throw error;
    }
}

async function createWindows() {
    const {server, port} = await startStaticServer();
    httpServer = server;
    appBaseUrl = `http://${STATIC_SERVER_HOST}:${port}`;

    controlWin = createSecureWindow({
        width: 1200,
        height: 800,
        title: `${APP_TITLE} - Contrôle`
    });

    await controlWin.loadURL(`${appBaseUrl}/control/control.html`);
}

app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', event => {
        event.preventDefault();
    });

    contents.on('will-navigate', (event, url) => {
        if (!isAllowedAppUrl(url)) {
            event.preventDefault();
        }
    });
});

app.whenReady().then(() => {
    configureSessionSecurity();
    return createWindows();
}).catch(error => {
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
