const express = require('express');
const { SerialPort } = require('serialport');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Variable global para el puerto serial abierto
let serialPort = null;

// Crear un servidor de WebSocket
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  ws.on('message', (message) => {
    console.log(`Received message => ${message}`);
  });
});

// Función para enviar mensajes a todos los clientes conectados
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Función para procesar los datos
function procesarDatos(data) {
  const patron = /\b([0-9]{1,3})a(-?[0-9]{1,5})a(-?[0-9]{1,5})a(-?[0-9]{1,5})a(-?[0-9]{1,5})a(-?[0-9]{1,4})\b/g;
  let matches = data.match(patron) || [];
  let datosSeparados = matches.map(match => match.split('a'));

  let count = datosSeparados.length;

  console.log(`Number of matches (excluding the last one): ${count}`);
  return { matches: datosSeparados, count: count };
}

// Rutas para manejar puertos seriales y comandos
app.get('/list-ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (error) {
    console.error('Error listing ports:', error);
    res.status(500).send('Error listing ports');
  }
});

app.post('/select-port', async (req, res) => {
  const { portName } = req.body;

  if (!portName) {
    return res.status(400).send('Port name is required');
  }

  try {
    if (serialPort) {
      serialPort.close();
    }

    serialPort = new SerialPort({
      path: portName,
      baudRate: 9600
    });

    serialPort.on('open', () => {
      console.log(`Port ${portName} opened successfully`);
      res.send(`Port ${portName} opened successfully`);
    });

    serialPort.on('error', (error) => {
      console.error('Error opening port:', error);
      res.status(500).send('Error opening port');
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error handling port');
  }
});

app.post('/send-commands', (req, res) => {
  const commands = [
    'AT+SEND=1,BUSCANDO_RED,1,0',
    'AT+SEND=1,CONEXION_EXITOSA,1,0',
    'AT+SEND=1,COMENZAR_TRANSMISION,1,0',
    'AT+SEND=1,REQUESTDATA,1,0'
  ];

  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).send('Port is not open');
  }

  console.log('Starting command sequence...');

  let currentCommandIndex = 0;
  let responseData = '';
  let listening = true;

  const onData = (data) => {
    if (!listening) return;

    responseData += data.toString();

    if (responseData.includes('BUSCANDOREDOK') && currentCommandIndex === 0) {
      listening = false;
      console.log('Received "BUSCANDO_RED_OK"');
      serialPort.removeListener('data', onData);

      broadcast({ status: 'BUSCANDO_RED_OK', currentCommandIndex });
      
      // Send next command
      currentCommandIndex++;
      if (currentCommandIndex < commands.length) {
        sendCommand(commands[currentCommandIndex], true);
      } else {
        broadcast({ status: 'COMPLETED' });
      }
    } else if (responseData.includes('CONEXIONEXITOSA') && currentCommandIndex === 1) {
      listening = false;
      console.log('Received "CONEXION_EXITOSA"');
      serialPort.removeListener('data', onData);

      broadcast({ status: 'CONEXION_EXITOSA', currentCommandIndex });
      
      // Send next command
      currentCommandIndex++;
      if (currentCommandIndex < commands.length) {
        sendCommand(commands[currentCommandIndex], true);
      } else {
        broadcast({ status: 'COMPLETED' });
      }
    } else if (responseData.includes('COMENZARTRANSMISIONOK') && currentCommandIndex === 2) {
      listening = false;
      console.log('Received "COMENZAR_TRANSMISION_OK"');
      serialPort.removeListener('data', onData);

      broadcast({ status: 'COMENZAR_TRANSMISION_OK', currentCommandIndex });
      
      // Send next command
      currentCommandIndex++;
      if (currentCommandIndex < commands.length) {
        sendCommand(commands[currentCommandIndex], true);
      } else {
        broadcast({ status: 'COMPLETED' });
      }
    } else if (responseData.includes('DATOSENVIADOS') && currentCommandIndex === 3) {
      listening = false;
      console.log('Stopping listening as "DATOSENVIADOS" received');
      console.log('Response:', responseData);
      serialPort.removeListener('data', onData);

      const datosProcesados = procesarDatos(responseData);
      console.log('Datos procesados:', datosProcesados);

      // Enviar datos al frontend a través de WebSocket
      broadcast({ 
        status: 'DATOSENVIADOS',
        datosProcesados,
        currentCommandIndex 
      });

      // Enviar el estado final de completado
      broadcast({ status: 'COMPLETED' });
    }
  };

  const sendCommand = (command, waitForResponse = false) => {
    console.log(`Sending command: ${command}`);
    listening = waitForResponse;
    if (waitForResponse) {
      serialPort.on('data', onData);
    }
    serialPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error('Error sending command:', err);
        broadcast({ status: 'ERROR', error: err.message });
      } else {
        console.log('Command sent successfully');
        broadcast({ status: 'COMMAND_SENT', command, currentCommandIndex });

        if (!waitForResponse) {
          // Send next command if available
          currentCommandIndex++;
          if (currentCommandIndex < commands.length) {
            sendCommand(commands[currentCommandIndex], currentCommandIndex === 1 || currentCommandIndex === 3);
          } else {
            broadcast({ status: 'COMPLETED' });
          }
        }
      }
    });
  };

  // Start sending the first command
  sendCommand(commands[currentCommandIndex], true);

  res.send('Command sequence started');
});

// Crear un servidor HTTP y agregar soporte para WebSocket
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
