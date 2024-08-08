import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@material-tailwind/react";
import ImageGrid from "../../components/ImageGrid";
import { toast } from 'react-toastify';

const Home = () => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processStarted, setProcessStarted] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    const fetchPorts = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/list-ports');
        if (!response.ok) {
          throw new Error('Failed to fetch ports');
        }
        const portsList = await response.json();
        setPorts(portsList);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Retrieve the selected port from LocalStorage
    const storedPort = localStorage.getItem('selectedPort');
    if (storedPort) {
      setSelectedPort(storedPort);
    }

    fetchPorts();

    // Initialize WebSocket
    ws.current = new WebSocket('ws://localhost:3001');
    ws.current.onopen = () => console.log('WebSocket connection opened');
    ws.current.onclose = () => console.log('WebSocket connection closed');
    ws.current.onerror = (event) => console.error('WebSocket error:', event);
    ws.current.onmessage = (message) => setLastMessage(message);

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const selectPort = async (portName) => {
    try {
      const response = await fetch('http://localhost:3001/select-port', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portName }),
      });

      if (response.ok) {
        setSelectedPort(portName);
        localStorage.setItem('selectedPort', portName); // Save port to LocalStorage
        toast.success('Port selected');
      } else {
        throw new Error('Error selecting port');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startProcess = () => {
    if (!selectedPort) {
      toast.warn('No port selected');
      return;
    }

    setLoading(true);
    fetch('http://localhost:3001/send-commands', { method: 'POST' })
      .then(() => {
        setLoading(false);
        toast.success('Command sent and process started');
        setProcessStarted(true);
      })
      .catch(() => {
        setLoading(false);
        toast.error('Error starting process');
      });
  };

  const refreshPorts = async () => {
    setError('');
    setPorts([]);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/list-ports');
      if (!response.ok) {
        throw new Error('Failed to fetch ports');
      }
      const portsList = await response.json();
      setPorts(portsList);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
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
        <>
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
        </>
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
}

export default Home;
