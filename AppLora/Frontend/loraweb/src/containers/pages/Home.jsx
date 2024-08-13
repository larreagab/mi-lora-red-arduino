import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@material-tailwind/react";
import ImageGrid from "../../components/ImageGrid";
import { toast } from 'react-toastify';
import ReconnectingWebSocket from 'reconnecting-websocket';

const Home = () => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processStarted, setProcessStarted] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);

  // Función para realizar peticiones fetch
  const fetchData = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      return await response.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      const portsList = await fetchData('http://localhost:3001/list-ports');
      if (portsList) setPorts(portsList);

      const selectedPortFromBackend = await fetchData('http://localhost:3001/selected-port');
      if (selectedPortFromBackend) {
        const { portName: selectedPortFromBackendName } = selectedPortFromBackend;
        const portExists = portsList?.some(port => port.path === selectedPortFromBackendName);
        if (portExists) {
          setSelectedPort(selectedPortFromBackendName);
          localStorage.setItem('selectedPort', selectedPortFromBackendName);
          toast.info(`Port ${selectedPortFromBackendName} is available and selected`);
        } else {
          localStorage.removeItem('selectedPort');
          toast.warn('Stored port is no longer available');
        }
      }
      
      setLoading(false);
    };

    initialize();

    // Inicializa el WebSocket
    ws.current = new ReconnectingWebSocket('ws://localhost:3001');
    ws.current.onopen = () => console.log('WebSocket connection opened');
    ws.current.onclose = () => console.log('WebSocket connection closed');
    ws.current.onerror = (event) => console.error('WebSocket error:', event);
    ws.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      setLastMessage(message);
      if (data.status === 'PORT_SELECTED') {
        setSelectedPort(data.portName);
        localStorage.setItem('selectedPort', data.portName);
        toast.success(`Port ${data.portName} selected`);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const selectPort = async (portName) => {
    try {
      const response = await fetch('http://localhost:3001/select-port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portName }),
      });

      if (response.ok) {
        //toast.success('Port selected');
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }
    } catch (err) {
      toast.error(err.message);
      localStorage.removeItem('selectedPort');
    }
  };

  const startProcess = async () => {
  
    // Verifica si hay un puerto seleccionado en el backend
    const selectedPortFromBackend = await fetchData('http://localhost:3001/selected-port');
    if (selectedPortFromBackend) {
      const { portName: selectedPortFromBackendName } = selectedPortFromBackend;
  
      if (selectedPortFromBackendName !== selectedPort) {
        toast.warn(`El puerto seleccionado en el frontend no coincide con el puerto en el backend (${selectedPortFromBackendName}).`);
        return;
      }
    } else {
      toast.error('No se pudo verificar el puerto seleccionado en el backend.');
      return;
    }
  
    setLoading(true);
    fetch('http://localhost:3001/send-commands', { method: 'POST' })
      .then(() => {
        setLoading(false);
        toast.success('Comando enviado y proceso iniciado');
        setProcessStarted(true);
      })
      .catch(() => {
        setLoading(false);
        toast.error('Error al iniciar el proceso');
      });
  };
  

  const refreshPorts = async () => {
    setError('');
    setPorts([]);
    setLoading(true);
  
    const portsList = await fetchData('http://localhost:3001/list-ports');
    
    if (portsList) {
      setPorts(portsList);
      const portExists = portsList.some(port => port.path === selectedPort);
  
      if (!portExists) {
        toast.warn('El puerto seleccionado ya no está disponible.');
        setSelectedPort('');
        localStorage.removeItem('selectedPort');
      } else {
        toast.info('El puerto seleccionado sigue disponible.');
      }
    }
  
    setLoading(false);
  };
  

  return (
    <div>
      <h1 className="text-3xl font-extralight underline">Instruciones de Uso</h1>
      <p className="text-justify">
        Para establecer la conexión de manera exitosa, asegúrese de tener el dispositivo USB correctamente conectado a la computadora.
      </p>

      <h2 className="text-2xl font-semibold mt-8">Selecionar Puerto</h2>
      {loading ? (
        <p>Loading ports...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <div className="flex items-center">
          <select
            className="border rounded p-2 mr-4"
            value={selectedPort}
            onChange={(e) => selectPort(e.target.value)}
          >
            <option value="" disabled>Seleccione un puerto</option>
            {ports.map((port, index) => (
              <option key={index} value={port.path}>
                {port.path} - {port.manufacturer}
              </option>
            ))}
          </select>
          <Button
            className="bg-blue-500 hover:bg-blue-700 text-white"
            onClick={refreshPorts}
          >
            Actualizar Puertos
          </Button>
        </div>
      )}

      <Button
        className="bg-[#21C0A5] mt-8"
        size="lg"
        onClick={startProcess}
        disabled={!selectedPort}
      >
        Comenzar
      </Button>

      <ImageGrid processStarted={processStarted} lastMessage={lastMessage} />
    </div>
  );
};

export default Home;
