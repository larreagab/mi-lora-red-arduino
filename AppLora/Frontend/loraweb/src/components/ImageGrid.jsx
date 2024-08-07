import React, { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { RotatingLines } from 'react-loader-spinner';
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/solid";

const ImageGrid = ({ processStarted }) => {
  const images = [
    { src: '/buscador.png', caption: 'Buscando Red' },
    { src: '/antena.png', caption: 'Conexion Exitosa' },
    { src: '/tocar.png', caption: 'Comenzar Transmision' },
    { src: '/exito.png', caption: 'Transmision Completa' },
  ];
  const [loadingStates, setLoadingStates] = useState([false, false, false, false]);
  const [processStates, setProcessStates] = useState([null, null, null, null]);
  const [processedData, setProcessedData] = useState(null);

  const { sendMessage, lastMessage, readyState } = useWebSocket('ws://localhost:3001', {
    onOpen: () => console.log('WebSocket connection opened'),
    onClose: () => console.log('WebSocket connection closed'),
    onError: (event) => console.error('WebSocket error:', event),
    onMessage: (message) => {
      const data = JSON.parse(message.data);
      if (data) {
        const { status, currentCommandIndex, datosProcesados } = data;
        console.log("index: ", currentCommandIndex);
        console.log("Status: ", status);
        if (status === 'COMMAND_SENT') {
          const newLoadingStates = [...loadingStates];
          newLoadingStates[currentCommandIndex] = true;
          setLoadingStates(newLoadingStates);
        } else if (status === 'BUSCANDO_RED_OK' || status === 'CONEXION_EXITOSA' || status === 'COMENZAR_TRANSMISION_OK' || status === 'DATOSENVIADOS') {
          const newLoadingStates = [...loadingStates];
          const newProcessStates = [...processStates];
          newLoadingStates[currentCommandIndex] = false;
          newProcessStates[currentCommandIndex] = 'success';
          setLoadingStates(newLoadingStates);
          setProcessStates(newProcessStates);
        } else if (status === 'ERROR') {
          const newLoadingStates = [...loadingStates];
          const newProcessStates = [...processStates];
          newLoadingStates[currentCommandIndex] = false;
          newProcessStates[currentCommandIndex] = 'error';
          setLoadingStates(newLoadingStates);
          setProcessStates(newProcessStates);
        } else if (status === 'COMPLETED') {
          // Finalizar proceso si es necesario
        }

        if (datosProcesados) {
          console.log('Datos Procesados:', datosProcesados);
          setProcessedData(datosProcesados);
        }
      }
    },
    shouldReconnect: () => false,
  }, processStarted);

  useEffect(() => {
    if (processStarted) {
      setLoadingStates([true, false, false, false]);
      setProcessStates([null, null, null, null]);
    }
  }, [processStarted]);

  // Function to download processed data as a .txt file
  const downloadProcessedData = () => {
    if (processedData) {
      const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datos_procesados.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="flex flex-col items-center">
            <img src={image.src} alt={image.caption} className="w-full h-auto object-cover" />
            <div className="mt-2 flex items-center justify-center">
              <p className="text-lg italic font-bold leading-[24.2px] text-center mr-2">{image.caption}</p>
              {loadingStates[index] ? (
                <RotatingLines strokeColor="grey" strokeWidth="5" animationDuration="0.75" width="24" visible={true} />
              ) : processStates[index] === 'success' ? (
                <CheckCircleIcon className="text-green-500 w-6 h-6" />
              ) : processStates[index] === 'error' ? (
                <XCircleIcon className="text-red-500 w-6 h-6" />
              ) : null}
            </div>  
          </div>
        ))}
      </div>

      {/* Button to download the processed data */}
      {processedData && (
        <div className="mt-4">
          <button
            onClick={downloadProcessedData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Descargar Datos Procesados
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;
