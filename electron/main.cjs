const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { URL } = require('url');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'OS Notes Pro',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'Acerca de OS Notes' },
              { type: 'separator' },
              { role: 'services', label: 'Servicios' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar OS Notes' },
              { role: 'hideOthers', label: 'Ocultar otros' },
              { role: 'unhide', label: 'Mostrar todos' },
              { type: 'separator' },
              { role: 'quit', label: 'Salir de OS Notes' },
            ],
          },
        ]
      : []),
    {
      label: 'Archivo',
      submenu: [isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restablecer zoom' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front', label: 'Traer al frente' }]
          : [{ role: 'close', label: 'Cerrar' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==============================================================
// GOOGLE OAUTH 2.0 FOR DESKTOP NATIVE APPS (RFC 8252 LOOPBACK)
// ==============================================================
ipcMain.handle('google-auth-desktop', async (event, { clientId, clientSecret }) => {
  if (!clientId) {
    throw new Error('Debes ingresar tu Client ID de Google Cloud.');
  }

  return new Promise((resolve, reject) => {
    let server = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (server) {
        try {
          server.close();
        } catch {}
      }
    };

    server = http.createServer(async (req, res) => {
      try {
        const host = req.headers.host || '127.0.0.1';
        const reqUrl = new URL(req.url, `http://${host}`);

        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>OS Notes - Error</title><meta charset="utf-8"></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 420px;">
                <h2 style="margin: 0 0 12px 0; color: #f87171;">Autorización no completada</h2>
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">Google reportó: ${error}</p>
                <p style="color: #64748b; font-size: 12px;">Puedes cerrar esta pestaña y volver a OS Notes Pro.</p>
              </div>
            </body>
            </html>
          `);
          cleanup();
          reject(new Error(`Autorización no completada: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>OS Notes - Conectado</title><meta charset="utf-8"></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="background: #1e293b; padding: 36px; border-radius: 20px; border: 1px solid #334155; text-align: center; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                <div style="width: 54px; height: 54px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 20px;">¡Autenticación exitosa!</h2>
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">Tu cuenta de Google Drive se ha vinculado correctamente a OS Notes.</p>
                <p style="color: #64748b; font-size: 12px;">Ya puedes cerrar esta pestaña del navegador y volver a <strong>OS Notes Pro</strong>.</p>
              </div>
            </body>
            </html>
          `);
          const port = server.address().port;
          const redirectUri = `http://127.0.0.1:${port}`;
          cleanup();

          const params = new URLSearchParams({
            code,
            client_id: clientId,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          });
          if (clientSecret) {
            params.set('client_secret', clientSecret);
          }

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });

          const tokenData = await tokenRes.json();
          if (tokenData.error) {
            reject(new Error(tokenData.error_description || tokenData.error));
            return;
          }

          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const profile = await profileRes.json();

          const user = {
            id: profile.sub || `google-${Date.now()}`,
            name: profile.name || 'Usuario Google',
            email: profile.email || '',
            picture: profile.picture || '',
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            isDemo: false,
          };

          resolve(user);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}`;

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file openid email profile');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // Open in user's default system browser (Chrome/Safari) - complies with Google policies
      shell.openExternal(authUrl.toString());
    });

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de espera agotado para el inicio de sesión.'));
    }, 120000);
  });
});

ipcMain.handle('google-auth-refresh', async (event, { clientId, clientSecret, refreshToken }) => {
  if (!refreshToken || !clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
  };
});
