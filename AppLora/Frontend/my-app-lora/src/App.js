import React, { useState, useEffect } from 'react';

function App() {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        alert('Port selected');
      } else {
        throw new Error('Error selecting port');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const sendCommand = async () => {
    if (!selectedPort) {
      alert('No port selected');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/send-command/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (response.ok) {
        alert('Command sent');
      } else {
        throw new Error('Error sending command');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Serial Command Sender</h1>
      <h2>Select Port</h2>
      {loading ? (
        <p>Loading ports...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <ul>
          {ports.map((port, index) => (
            <li key={index}>
              {port.path} - {port.manufacturer}
              <button onClick={() => selectPort(port.path)}>Select</button>
            </li>
          ))}
        </ul>
      )}
      <h2>Send Command</h2>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Enter command"
        style={{ padding: '10px', fontSize: '16px' }}
      />
      <button
        onClick={sendCommand}
        style={{ padding: '10px', marginLeft: '10px' }}
        disabled={!selectedPort || !command} // Deshabilita el botón si no hay puerto seleccionado o comando vacío
      >
        Send
      </button>
    </div>
  );
}

export default App;
