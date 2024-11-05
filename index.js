const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverInstance; // Para almacenar la referencia al servidor

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Para permitir require en renderer.js
      contextIsolation: false // Permitir la comunicación directa
    }
  });

  win.loadFile('index.html');

  if (!serverInstance) {
    serverInstance = fork(path.join(__dirname, 'server.js'));

    serverInstance.on('message', (msg) => {
      if (typeof msg === 'string') {
        win.webContents.send('log-message', msg);  // Enviar los logs al renderer
      } else if (msg.type === 'active-connections') {
        win.webContents.send('active-connections', msg.data);  // Enviar conexiones activas
      } else if (msg.type === 'connection-data') {
        win.webContents.send('connection-data', msg.data);  // Enviar los datos de la conexión
      }
    });

    win.webContents.send('server-status', 'Servidor iniciado');
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Manejar el inicio/detención del servidor desde la GUI
ipcMain.on('start-server', (event) => {
  if(!serverInstance){
    serverInstance = fork(path.join(__dirname, 'server.js'));
  
    serverInstance.on('message', (msg) => {
      if (typeof msg === 'string') {
          event.reply('log-message', msg);  // Enviar los logs al renderer
      } else if (msg.type === 'active-connections') {
          event.reply('active-connections', msg.data);  // Enviar conexiones activas
      } else if (msg.type === 'connection-data') {
          event.reply('connection-data', msg.data);  // Enviar los datos de la conexión
      }
    });
  
    event.reply('server-status', 'Servidor iniciado');
  }
});

ipcMain.on('stop-server', (event) => {
  if (serverInstance) {
    serverInstance.send('stop-server');
    serverInstance.on('exit', () => {
      event.reply('server-status', 'Servidor detenido');
      serverInstance = null;
    });
  }
});

ipcMain.on('view-connection-data', (event, roomName) => {
  if (serverInstance) {
      serverInstance.send({ type: 'view-connection-data', roomName });
  }
});