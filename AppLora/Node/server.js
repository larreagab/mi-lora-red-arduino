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
  ws.on('close', () => {
    console.log('WebSocket connection closed');
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

  console.log(`Number of matches: ${datosSeparados.length}`);
  return { matches: datosSeparados, count: datosSeparados.length };
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

  // Cerrar el puerto existente si está abierto
  if (serialPort && serialPort.isOpen) {
    console.log(`Closing port ${serialPort.path}...`);
    serialPort.close((err) => {
      if (err) {
        console.error('Error closing port:', err);
      } else {
        //console.log(`Port ${serialPort.path} closed successfully`);
      }
      openPort(portName, res);  // Abrir el nuevo puerto después de cerrar el anterior
    });
  } else {
    openPort(portName, res);  // Abrir el nuevo puerto si no hay puerto abierto
  }
});

const openPort = (portName, res) => {
  try {
    serialPort = new SerialPort({
      path: portName,
      baudRate: 9600
    });

    serialPort.on('open', () => {
      console.log(`Port ${portName} opened successfully`);
      res.send(`Port ${portName} opened successfully`);
    });

    serialPort.on('close', () => {
      console.log(`Port ${portName} closed`);
      serialPort = null;
      broadcast({ status: 'PORT_CLOSED' });
    });

    serialPort.on('error', (error) => {
      console.error('Error opening port:', error);
      res.status(500).send('Error opening port');
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error handling port');
  }
};

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
    const commandResponseMap = {
      0: 'BUSCANDOREDOK',
      1: 'CONEXIONEXITOSA',
      2: 'COMENZARTRANSMISIONOK',
      3: 'DATOSENVIADOS'
    };

    const responseType = commandResponseMap[currentCommandIndex];
    if (responseData.includes(responseType)) {
      console.log(`Received "${responseType}"`);
      listening = false;
      serialPort.removeListener('data', onData);
      
      broadcast({ status: responseType, currentCommandIndex });

      if (currentCommandIndex === 3) {
        const datosProcesados = procesarDatos(responseData);
        broadcast({ status: 'DATOSENVIADOS', datosProcesados, currentCommandIndex });
        console.log('Processed data:', datosProcesados);
        broadcast({ status: 'COMPLETED' });
        return;
      }

      // Send next command
      currentCommandIndex++;
      sendCommand(commands[currentCommandIndex], true);
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
