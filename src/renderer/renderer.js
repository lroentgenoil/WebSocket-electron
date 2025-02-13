const { ipcRenderer } = require('electron');

document.getElementById('startServer').addEventListener('click', () => {
  ipcRenderer.send('start-server');
});

document.getElementById('stopServer').addEventListener('click', () => {
  ipcRenderer.send('stop-server');
});

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById(sectionId).style.display = 'block';
}

// Mostrar la parte principal al inicio
showSection('mainSection');

// Manejo de los botones para cambiar entre las secciones
document.getElementById('showLogs').addEventListener('click', () => {
  showSection('logsSection');
});

document.getElementById('showConnections').addEventListener('click', () => {
  showSection('connectionsSection');
});

document.getElementById('backToMainFromLogs').addEventListener('click', () => {
  showSection('mainSection');
});

document.getElementById('backToMainFromConnections').addEventListener('click', () => {
  showSection('mainSection');
});

document.getElementById('deleteServerLogs').addEventListener('click', () => {
  const logArea = document.getElementById('log');
  logArea.value = '';
});

// funcionalidad index.js
ipcRenderer.on('server-status', (event, message) => {
  document.getElementById('status-span').innerText = `${message}`;
  document.getElementById('status-span').classList = message == 'Servidor Iniciado' ? 'badge text-bg-success' : 'badge text-bg-danger';
});

ipcRenderer.on('log-message', (event, log) => {
  const logArea = document.getElementById('log');
  logArea.value += `${log}\n`; // Agregar el nuevo log al final del textarea
  logArea.scrollTop = logArea.scrollHeight; // Desplazar hacia abajo
});

// Mostrar las conexiones activas en la tabla
ipcRenderer.on('active-connections', (event, connections) => {
  const tableBody = document.querySelector('#connectionsTable tbody');
  tableBody.innerHTML = ''; 

  // Iterar sobre las conexiones y agregarlas a la tabla
  for (const [roomName, activeConnections] of Object.entries(connections)) {
    const row = document.createElement('tr');
    const roomCell = document.createElement('td');
    const connectionCell = document.createElement('td');
    const actionCell = document.createElement('td');
    const viewButton = document.createElement('button');
    const deleteTCPLogs = document.createElement('button');

    roomCell.innerText = roomName;
    connectionCell.innerText = activeConnections;
    viewButton.innerText = 'Ver datos';
    deleteTCPLogs.innerText = 'Borrar Logs';
    
    // Añadir un listener para el botón de ver datos
    viewButton.addEventListener('click', () => {
      ipcRenderer.send('view-connection-data', roomName);  // Enviar la sala al backend
    });

    deleteTCPLogs.addEventListener('click', () => {
      ipcRenderer.send('delete-tcp-logs', roomName);  // Enviar la sala al backend
    });

    actionCell.appendChild(viewButton);
    actionCell.appendChild(deleteTCPLogs);
    row.appendChild(roomCell);
    row.appendChild(connectionCell);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  }
});

ipcRenderer.on('connection-data', (event, data) => {
  const dataArea = document.getElementById('dataArea');
  dataArea.value = data;
});

ipcRenderer.on('error-server', (event, message) => {
  document.getElementById('status-span').innerText = `${message}`;
  document.getElementById('status-span').classList = message == 'Servidor Iniciado' ? 'badge text-bg-success' : 'badge text-bg-danger';
});