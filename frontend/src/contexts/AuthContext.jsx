import { useContext, useEffect } from "react";
import { useState } from "react";
import { createContext } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";

const AuthContext = createContext();
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getCurrentUser = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${backendUrl}/api/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data);
    } catch (error) {
      console.log("Error fetching user: ", error);
      logout(); //if token is invalid
    }
  };
  const fetchUserAndPhoto = async (userId, token) => {
    try {
      const res = await axios.get(`${backendUrl}/api/v1/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...res.data, userId: res.data._id });
    } catch (err) {
      console.error("Failed to fetch user photo:", err);
      logout();
    }
  };

  const setAuthState = async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    try {
      const decodedUser = jwtDecode(newToken);
      await fetchUserAndPhoto(decodedUser.userId, newToken);
    } catch (err) {
      console.log("Invalid token: ", err);
      logout();
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/v1/user/register`,
        userData
      );
      if (response.data.success) {
        toast.success("Welcome! Registration Successfull. ✨");
        await setAuthState(response.data.data.token);
        navigate("/profile");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Registration Failed. Please try again"
      );
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${backendUrl}/api/v1/user/login`, {
        email,
        password,
      });
      if (response.data.success) {
        toast.success("Welcome back to your Grimoire🪄");
        setAuthState(response.data.data.token);
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(
        error.message || "Login failed, please check your credentials"
      );
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    toast.success("Logout Successful");
    navigate("/login");
  };

  //to check token on initial app load for fetching previos session
  useEffect(() => {
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        const isExpired = decodedUser.exp * 1000 < Date.now();
        if (isExpired) {
          logout();
        } else {
          fetchUserAndPhoto(decodedUser.userId, token);
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setAuthState,
        setUser,
        setToken,
        getCurrentUser,
        token,
        login,
        register,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
