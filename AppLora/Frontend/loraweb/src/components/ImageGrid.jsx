import React, { useState, useEffect, useCallback } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/solid";
import { Button } from "@material-tailwind/react";
import * as XLSX from 'xlsx';

const ImageGrid = ({ processStarted, lastMessage }) => {
  const images = [
    { src: '/buscador.png', caption: 'Buscando Red' },
    { src: '/antena.png', caption: 'Conexión Exitosa' },
    { src: '/tocar.png', caption: 'Comenzar Transmisión' },
    { src: '/exito.png', caption: 'Transmisión Completa' },
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

  const downloadExcel = useCallback(() => {
    if (processedData) {
      const worksheet = XLSX.utils.json_to_sheet(
        processedData.matches.map(match => ({
          Nodo: match[0],
          Humedad: parseFloat(match[1]) / 100,
          Temperatura: parseFloat(match[2]) / 100,
          'Humedad del Suelo': match[3],
          Luminosidad: match[4],
          'Nivel de Lluvia': match[5],
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      XLSX.writeFile(workbook, 'datos_procesados.xlsx');

      // Reset states after downloading
      setLoadingStates([false, false, false, false]);
      setProcessStates([null, null, null, null]);
      setProcessedData(null);
    }
  }, [processedData]);

  return (
    <div className="container max-w-full px-4 py-8">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {images.map((image, index) => (
          <div key={index} className="flex flex-col items-center">
            <img src={image.src} alt={image.caption} className="w-36 h-auto object-cover" />
            <div className="mt-2 flex items-center justify-center">
              <p className="text-2xl italic font-bold leading-[24.2px] text-center mr-2">{image.caption}</p>
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
        <div className="mt-8 flex justify-center space-x-4">
          <Button onClick={downloadProcessedData} className="bg-[#21C0A5]">
            Descargar Datos Procesados
          </Button>
          <Button onClick={downloadExcel} className="bg-[#21C0A5]">
            Descargar Excel
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;
