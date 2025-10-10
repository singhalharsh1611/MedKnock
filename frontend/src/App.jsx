import { Routes, Route, Navigate } from "react-router-dom";
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
import Compare from "./pages/Compare";
import StatsPage from "./pages/StatsPage";
import GoogleSuccess from "./components/GoogleSucess";
import LandingPage from "./pages/LandingPage";
import { ReportsPage } from "./pages/ReportsPage";
import Last7DaysLogs from "./pages/Last7DaysLogs";
import AddByImage from "./pages/AddByImage";

function App() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { token } = useAuth();

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={token ? <Navigate to="/dashboard" /> : <LandingPage />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/report/:id" element={<ShareableReport />} />

        {/* Protected Routes */}
        {token && (
          <Route path="/" element={<Layout />}>
            {/* The index route automatically renders at the parent's path ("/") */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="grimoire" element={<Grimoire />} />
            <Route path="profile" element={<Profile />} />
            <Route path="compare" element={<Compare />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="add-by-image" element={<AddByImage />} />
            <Route path="logs" element={<Last7DaysLogs />} />
          </Route>
        )}

        {/* This route will catch any path that wasn't matched above */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Floating Chatbot */}
      {token && !isChatbotOpen && (
        <Button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full magical-button shadow-2xl z-50 hover:scale-110 transition-transform"
          style={{
            boxShadow:
              "0 0 20px rgba(99,102,241,0.6), inset 0 0 10px rgba(99,102,241,0.3)",
          }}
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
