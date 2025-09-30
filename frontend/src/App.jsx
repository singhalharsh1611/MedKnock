// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/Layout";
import { ChatbotWindow } from "./components/ChatbotWindow";
import { Button } from "./components/ui/button";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Grimoire from "./pages/Grimoire";
import ShareableReport from "./pages/ShareableReport";
import NotFound from "./pages/NotFound";
// import { Layout } from "./components/Layout";
// import { ChatbotWindow } from "./components/ChatbotWindow";
// import { Button } from "./components/ui/button";
// import { MessageCircle } from "lucide-react";

function App() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
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
        <Route path="*" element={<NotFound />} />
       
      </Routes>
      {/* Floating Chatbot Button */}
      <Button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-4 left-4 w-14 h-14 rounded-full magical-button shadow-2xl z-50"
        style={{ boxShadow: "var(--mystical-glow)" }}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chatbot Window */}
      <ChatbotWindow
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />
    </BrowserRouter>
  );
}

export default App;
