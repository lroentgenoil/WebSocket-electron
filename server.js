const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const net = require('net');
const readerConnections = new Map();
const connectionDataMap = new Map();
// Inicializa el servidor express 
const app = express();
const server = http.createServer(app);
// localhost
const protocolOrigin = 'http';
const ipOrigin = '127.0.0.1';
const portOrigin = '8081';

function logMessage(message) {
    process.send(message);
}

function sendActiveConnections() {
    const connectionStatus = {};
    
    // Iterar sobre cada sala y contar las conexiones activas
    for (const [roomName, connectionsInRoom] of readerConnections.entries()) {
        connectionStatus[roomName] = connectionsInRoom.size;
    }

    if (process.send) {
        process.send({ type: 'active-connections', data: connectionStatus });
    }
}

function sendConnectionData(roomName) {
    const data = connectionDataMap.get(roomName).data || "No hay datos para esta conexión.";
    if (process.send) {
        process.send({ type: 'connection-data', data });
    }
}

function stopServer(callback) {
    // Cerrar todas las conexiones de WebSocket activas
    logMessage("Deteniendo conexiones de WebSocket\n");
    io.sockets.sockets.forEach(socket => {
        socket.disconnect(true); // Desconecta y limpia
    });


    // Cerrar todas las conexiones TCP activas
    logMessage("Deteniendo conexiones TCP\n");
    for (const connectionsInRoom of readerConnections.values()) {
        for (const cliente of connectionsInRoom) {
            cliente.end(); // Cierra las conexiones TCP
        }
    }
    readerConnections.clear();

    // Detener el servidor HTTP
    server.close(callback);
    logMessage("Servidor cerrado\n");
}

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// WebSocket para la conexión con el frontend
const io = new Server(server, {
    cors: {
        origin: `${protocolOrigin}://${ipOrigin}:${portOrigin}`,
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    allowUpgrades: false,
    pingTimeout: null,
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomName) => {
        const [HOST, PORT] = roomName.split(':');

        socket.join(roomName);
        logMessage("Conectado Desde: " + roomName +"\n");

        if (!readerConnections.has(roomName)) {
            readerConnections.set(roomName, new Set());
            connectionDataMap.set(roomName, {data: '', estado: false});
        }

        const connectionsInRoom = readerConnections.get(roomName);
        const cliente = new net.Socket();

        cliente.connect(PORT, HOST, () => {
            logMessage(`Conectado al lector RFID en la sala ${roomName}\n`);
        });

        cliente.on('data', (data) => {
            const dataRFID = data.toString();
            io.to(roomName).emit("send-chat-to-clients", dataRFID);
            
            // Guardar los datos recibidos
            const currentData = connectionDataMap.get(roomName).data || '';
            connectionDataMap.set(roomName, {data: currentData + 'Datos Enviados:\n' + dataRFID + '\n', estado: connectionDataMap.get(roomName).estado ?? false});

            if(connectionDataMap.get(roomName).estado){
                sendConnectionData(roomName);
            }
        });

        cliente.on('error', (err) => {
            logMessage(`Error en la conexión con el lector RFID en la sala ${roomName}:` + err + "\n");
            io.to(roomName).emit("error", `Error en la conexión con el lector RFID: ${err.message}`);
            cliente.end();
            connectionsInRoom.delete(cliente);
            if (connectionsInRoom.size === 0) {
                readerConnections.delete(roomName);
            }
            sendActiveConnections();
        });

        cliente.on('close', () => {
            logMessage(`Conexión con el lector RFID en la sala ${roomName} cerrada\n`);
            io.to(roomName).emit("error", `Se ha perdido la conexion con la lectora RFID`);
            connectionsInRoom.delete(cliente);
            if (connectionsInRoom.size === 0) {
                readerConnections.delete(roomName);
            }
            sendActiveConnections();
        });

        connectionsInRoom.add(cliente);

        sendActiveConnections();
    });

    socket.on("disconnect", () => {
        logMessage("Desconectado\n");
        for (const connectionsInRoom of readerConnections.values()) {
            for (const cliente of connectionsInRoom) {
                cliente.end();
            }
        }
        readerConnections.clear();
        sendActiveConnections();
    });
});

// Inicia el servidor en el puerto 9091
server.listen(9091, ipOrigin, () => {
    logMessage("Servidor WebSocket corriendo\n");
});

process.on('message', (msg) => {
    if (typeof msg === 'string' && msg === 'stop-server') {
        stopServer(() => {
            process.exit(); // Salir del proceso después de detener el servidor
        });
    } else if (msg.type === 'view-connection-data') {
        for (const [roomName, connectionData] of connectionDataMap.entries()) {
            connectionDataMap.set(roomName, {data: connectionData.data, estado: false});
        }
        var mapConnection = connectionDataMap.get(msg.roomName);
        if (mapConnection) {
            connectionDataMap.set(msg.roomName, {data: mapConnection.data, estado: true});
        }
    }
});

module.exports = server;
