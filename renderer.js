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

// funcionalidad index.js
ipcRenderer.on('server-status', (event, message) => {
  document.getElementById('status').innerText = `Estado del servidor: ${message}`;
});

ipcRenderer.on('log-message', (event, log) => {
  const logArea = document.getElementById('log');
  logArea.value += `${log}\n`; // Agregar el nuevo log al final del textarea
  logArea.scrollTop = logArea.scrollHeight; // Desplazar hacia abajo
});

// Mostrar las conexiones activas en la tabla
ipcRenderer.on('active-connections', (event, connections) => {
  const tableBody = document.querySelector('#connectionsTable tbody');
  tableBody.innerHTML = '';  // Limpiar la tabla antes de actualizar

  // Iterar sobre las conexiones y agregarlas a la tabla
  for (const [roomName, activeConnections] of Object.entries(connections)) {
    const row = document.createElement('tr');
    const roomCell = document.createElement('td');
    const connectionCell = document.createElement('td');
    const actionCell = document.createElement('td');
    const viewButton = document.createElement('button');

    roomCell.innerText = roomName;
    connectionCell.innerText = activeConnections;
    viewButton.innerText = 'Ver datos';
    
    // Añadir un listener para el botón de ver datos
    viewButton.addEventListener('click', () => {
      ipcRenderer.send('view-connection-data', roomName);  // Enviar la sala al backend
    });

    actionCell.appendChild(viewButton);
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