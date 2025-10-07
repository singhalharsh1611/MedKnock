import AuthContext from "@/contexts/AuthContext";
import { useContext, useEffect, useRef } from "react"; 
import { useNavigate } from "react-router-dom";

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const { setAuthState } = useContext(AuthContext);

  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }

    const handleAuth = async () => {
      hasProcessed.current = true;

      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        try {
          await setAuthState(token);
          navigate("/");
        } catch (error) {
          console.error("Authentication failed:", error);
          navigate("/login");
        }
      } else {
        console.error("No token found in URL, redirecting to login.");
        navigate("/login");
      }
    };

    handleAuth();
  }, [navigate, setAuthState]);

  return <div>Finalizing authentication...</div>;
};

export default GoogleSuccess;