import React, { useState, useEffect } from 'react';
import { Button } from "@material-tailwind/react";
import ImageGrid from "../../components/ImageGrid";
import { toast } from 'react-toastify';

const Home = () => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processStarted, setProcessStarted] = useState(false);

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

  return (
    <div>
      <h1 className="text-3xl font-extralight underline">Instruciones de Uso</h1>
      <p className="text-justify">
        Para establecer la conexión de manera exitosa, asegúrese de tener el dispositivo USB correctamente conectado a la computadora.
      </p>

      <h2 className="text-2xl font-semibold mt-8">Select Port</h2>
      {loading ? (
        <p>Loading ports...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <ul className="list-disc ml-5">
          {ports.map((port, index) => (
            <li key={index} className="my-2">
              {port.path} - {port.manufacturer}
              <Button
                onClick={() => selectPort(port.path)}
                className="ml-4 bg-blue-500 hover:bg-blue-700 text-white"
              >
                Select
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        className="bg-[#21C0A5] mt-8"
        size="lg"
        onClick={startProcess}
      >
        Comenzar
      </Button>

      <ImageGrid processStarted={processStarted} />
    </div>
  );
}

export default Home;
