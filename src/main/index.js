const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverInstance; // Para almacenar la referencia al servidor

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Para permitir require en renderer.js
      contextIsolation: false // Permitir la comunicación directa
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  const menu = Menu.buildFromTemplate([
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/lroentgenoil/WebSocket-electron')
          }
        }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize' },
        {
          label: 'Abrir',
          click: () => {
            // Acción para el menú "Abrir"
            console.log('Abrir seleccionado');
          }
        },
      ]
    }
  ]);

  // Asignar el menú a la ventana
  Menu.setApplicationMenu(menu);
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
    serverInstance = fork(path.join(__dirname, '../services/server.js'));
  
    serverInstance.on('message', (msg) => {
      if (typeof msg === 'string') {
          event.reply('log-message', msg);  // Enviar los logs al renderer
      } else if (msg.type === 'active-connections') {
          event.reply('active-connections', msg.data);  // Enviar conexiones activas
      } else if (msg.type === 'connection-data') {
          event.reply('connection-data', msg.data);  // Enviar los datos de la conexión
      }
    });
  
    event.reply('server-status', 'Servidor Iniciado');
  }
});

ipcMain.on('stop-server', (event) => {
  if (serverInstance) {
    serverInstance.send('stop-server');
    serverInstance.on('exit', () => {
      event.reply('server-status', 'Servidor Detenido');
      serverInstance = null;
    });
  }
});

ipcMain.on('view-connection-data', (event, roomName) => {
  if (serverInstance) {
      serverInstance.send({ type: 'view-connection-data', roomName });
  }
});