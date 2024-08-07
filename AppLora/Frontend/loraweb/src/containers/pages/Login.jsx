import React from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@material-tailwind/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/solid";

const Login = () => {
  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-4 lg:px-6">
      <img
        src="fondo.svg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover -z-10" // Usamos -z-10 para asegurarnos de que la imagen esté detrás del contenido
      />
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <img
          className="mx-auto h-64 w-auto py-5"
          src="/icono.svg"
          alt="Workflow"
        />
        
        <form className="space-y-6" autoComplete="off">
            
              
              <div className="mt-1">
                {/* <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                /> */}
                <Input autoComplete='nope' color="white" label="USUARIO" />
              </div>
            

            
              
              <div className="mt-1">
                {/* <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                /> */}
                <Input  autoComplete='none'  color="white" label="CONTRASEÑA" icon={ <CheckCircleIcon />}/>
              </div>
            
            

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#21C0A5] bg-white hover:bg-cyan-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                INICIAR
              </button>
              
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#21C0A5] bg-white hover:bg-cyan-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                REGISTRARSE
              </button>
              
            </div>
            <div className="flex justify-end">
              <div className="text-sm">
                <Link
                  to="/reset_password"
                  className="font-medium text-white text-right hover:text-indigo-500"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
          </form>
      </div>

      
    </div>
  );
};

export default Login;
