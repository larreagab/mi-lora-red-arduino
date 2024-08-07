
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import React from "react";
import Home from "./containers/pages/Home";
import Login from "./containers/pages/Login";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  

  return (
    <Router>
      
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={ <Login />} />
          </Routes>
          <ToastContainer />
    </Router>
  )
    
}

export default App
