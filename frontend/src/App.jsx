// import { useState } from 'react'
// import './App.css'
// import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// import Login from './pages/Login'
// import Register from './pages/Register'
// import Dashboard from './pages/Dashboard'
// import Grimoire from './pages/Grimoire'
// import ShareableReport from './pages/ShareableReport'
// import { Layout } from './components/Layout'

// function App() {
  
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Navigate to="/dashboard" replace />} />
//               <Route path="/login" element={<Login />} />
//               <Route path="/register" element={<Register />} />
//               <Route path="/report/:id" element={<ShareableReport />} />
//               <Route path="/" element={<Layout />}>
//                 <Route path="dashboard" element={<Dashboard />} />
//                 <Route path="grimoire" element={<Grimoire />} />
//               </Route>
//       </Routes>
//     </BrowserRouter>
//   )
// }

// export default App
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Grimoire from "./pages/Grimoire";
import ShareableReport from "./pages/ShareableReport";
import { Layout } from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/report/:id" element={<ShareableReport />} />

        {/* App layout with default dashboard */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="grimoire" element={<Grimoire />} />
        </Route>

        {/* Optional 404 
        <Route path="*" element={<NotFound />} />
        */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
