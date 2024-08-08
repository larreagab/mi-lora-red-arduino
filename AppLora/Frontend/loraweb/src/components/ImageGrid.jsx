import React, { useState, useEffect, useCallback } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/solid";
import { Button } from "@material-tailwind/react";

const ImageGrid = ({ processStarted, lastMessage }) => {
  const images = [
    { src: '/buscador.png', caption: 'Buscando Red' },
    { src: '/antena.png', caption: 'Conexion Exitosa' },
    { src: '/tocar.png', caption: 'Comenzar Transmision' },
    { src: '/exito.png', caption: 'Transmision Completa' },
  ];

  const [loadingStates, setLoadingStates] = useState([false, false, false, false]);
  const [processStates, setProcessStates] = useState([null, null, null, null]);
  const [processedData, setProcessedData] = useState(null);

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data) {
        const { status, datosProcesados, currentCommandIndex } = data;

        console.log("index: ", currentCommandIndex);
        console.log("Status: ", status);

        const updateStates = (index, status) => {
          setLoadingStates(prev => prev.map((state, i) => i === index ? (status === 'COMMAND_SENT') : false));
          setProcessStates(prev => prev.map((state, i) => i === index ? (status === 'COMMAND_SENT' ? null : status === 'ERROR' ? 'error' : 'success') : state));
        };

        if (status === 'COMMAND_SENT' || status === 'BUSCANDOREDOK' || status === 'CONEXIONEXITOSA' || status === 'COMENZARTRANSMISIONOK' || status === 'DATOSENVIADOS' || status === 'ERROR') {
          updateStates(currentCommandIndex, status);
        } else if (status === 'COMPLETED') {
          // Finalizar proceso si es necesario
        }

        if (datosProcesados) {
          console.log('Datos Procesados:', datosProcesados);
          setProcessedData(datosProcesados);
        }
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (processStarted) {
      setLoadingStates([true, false, false, false]);
      setProcessStates([null, null, null, null]);
    }
  }, [processStarted]);

  const downloadProcessedData = useCallback(() => {
    if (processedData) {
      const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datos_procesados.txt';
      a.click();
      URL.revokeObjectURL(url);

      // Reset states after downloading
      setLoadingStates([false, false, false, false]);
      setProcessStates([null, null, null, null]);
      setProcessedData(null);
    }
  }, [processedData]);

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

      {processedData && (
        <div className="mt-8 flex justify-center">
          <Button onClick={downloadProcessedData} className="bg-[#21C0A5]">
            Descargar Datos Procesados
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;
