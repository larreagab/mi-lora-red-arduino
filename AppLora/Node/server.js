const express = require('express');
const { SerialPort } = require('serialport');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Variable global para el puerto serial abierto
let serialPort = null;

// Ruta para listar puertos
app.get('/list-ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (error) {
    console.error('Error listing ports:', error);
    res.status(500).send('Error listing ports');
  }
});

// Ruta para seleccionar un puerto
app.post('/select-port', async (req, res) => {
  const { portName } = req.body;

  if (!portName) {
    return res.status(400).send('Port name is required');
  }

  try {
    // Cerrar el puerto serial si ya está abierto
    if (serialPort) {
      serialPort.close();
    }

    // Abre el puerto seleccionado
    serialPort = new SerialPort({
      path: portName,
      baudRate: 9600 // Ajusta la tasa de baudios según sea necesario
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

// Ruta para enviar comandos
app.post('/send-command', (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).send('Command is required');
  }

  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).send('Port is not open');
  }

  console.log(`Sending command: ${command}`); // Depuración

  try {
    // Variable para acumular los datos recibidos
    let responseData = '';
    let listening = true; // Variable para controlar la escucha

    // Configura el puerto serial para leer los datos recibidos
    serialPort.on('data', function onData(data) {
      if (!listening) return; // Si no estamos escuchando, no hacemos nada

      responseData += data.toString();
      console.log('Received data:', data.toString());

      // Verifica si el mensaje contiene "DATOSENVIADOS" y detén la escucha
      if (responseData.includes('DATOSENVIADOS')) {
        listening = false; // Detén la escucha
        console.log('Stopping listening as "DATOSENVIADOS" received');
        console.log('Response:', responseData); // Depuración
        serialPort.removeListener('data', onData); // Remueve el listener
      }
    });

    // Envía el comando al puerto serial con terminador de línea
    serialPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error('Error sending command:', err);
        res.status(500).send('Error sending command');
      } else {
        res.send('Command sent successfully');
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error sending command');
  }
});

// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
