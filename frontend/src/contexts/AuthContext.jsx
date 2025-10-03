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
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    const setAuthState = (newToken) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        try {
            const decodedUser = jwtDecode(newToken);
            setUser({ userId: decodedUser.userId });
        }
        catch (err) {
            console.log("Invalid token: ", err);
            logout();
        }
    };

    const register = async (userData) => {
        try {
            const response = await axios.post(`${backendUrl}/api/v1/user/register`, userData);
            if (response.data.success) {
                toast.success("Welcome! Registration Successfull. ✨");
                setAuthState(response.data.data.token);
                navigate("/profile");
            }
        }

        catch (error) {
            toast.error(error.response?.data?.message || "Registration Failed. Please try again");
            throw error;
        }
    }

    const login = async (email, password) => {
        try {
            const response = await axios.post(`${backendUrl}/api/v1/user/login`, { email, password });
            if (response.data.success) {
                toast.success("Welcome back to your Grimoire🪄");
                setAuthState(response.data.data.token);
                navigate('/dashboard');
            }

        }
        catch (error) {
            toast.error(error.message || "Login failed, please check your credentials");
            throw error;
        }
    }

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
        toast.success("Logout Successful");
        navigate('/login');
    }

    //to check token on initial app load for fetching previos session
    useEffect(() => {
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                const isExpired = decodedUser.exp * 1000 < Date.now();
                if (isExpired) {
                    logout();
                } else {
                    setUser({ userId: decodedUser.userId });
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);