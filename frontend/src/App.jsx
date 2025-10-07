import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Profile from "./pages/Profile";
import { useAuth } from "./contexts/AuthContext";
import ForgotPassword from "./pages/ForgetPassword";
import GoogleSuccess from "./components/GoogleSucess";
import StatsPage from "./pages/StatsPage";

function App() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { token } = useAuth();
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
         <Route path="/forgot-password" element={<ForgotPassword />}/>
         <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/report/:id" element={<ShareableReport />} />

        {/* protected-App layout with default dashboard */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="grimoire" element={<Grimoire />} />
          <Route path="profile" element={<Profile />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />

      </Routes>
      {/* Floating Chatbot Button */}
      {
        token && !isChatbotOpen && (
          <Button
            onClick={() => setIsChatbotOpen(!isChatbotOpen)}
            className="fixed bottom-4 left-4 w-14 h-14 rounded-full magical-button shadow-2xl z-50"
            style={{ boxShadow: "var(--mystical-glow)" }}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

      {/* Chatbot Window */}

      {token && (
        <ChatbotWindow
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
        />
      )}
    </>
  );
}

export default App;