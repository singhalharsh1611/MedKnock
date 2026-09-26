import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Chrome,
  KeyRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import DarkVeil from "@/components/ui/DarkVeil";
import axios from "axios";

const Register = () => {
  const { register, token } = useAuth();
  if (token) return <Navigate to="/dashboard" />;
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${backendUrl}/api/v1/user/send-verification-otp`,
        {
          email: formData.email,
        }
      );

      if (response.data.success) {
        toast.success("OTP sent to your email");
        setStep(2);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Something went wrong.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Register
  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setIsLoading(true);
      const verifyRes = await axios.post(
        `${backendUrl}/api/v1/user/verify-email-otp`,
        {
          email: formData.email,
          otp,
        }
      );

      if (!verifyRes.data.success) {
        toast.error(verifyRes.data.message);
        return;
      }

      // Proceed to register
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
    } catch (err) {
      console.error(err);
      toast.error("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = `${
      import.meta.env.VITE_BACKEND_URL
    }/api/v1/user/google`;
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <DarkVeil />
      </div>
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-medical-purple medicine-glow" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              MedKnock
            </h1>
            <p className="text-muted-foreground">
              Create your medical medications
            </p>
          </div>

          <Card
            className="p-12 text-center max-w-md w-full shadow-2xl z-10"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(3px)",
              position: "absolute",
            }}
          >
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <Label
                    htmlFor="firstName"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" /> First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="First name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Last name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="medical@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a secret process"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" /> Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm your secret process"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="medical-button w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> Enter OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="text-center tracking-widest font-mono"
                  />
                </div>

                <Button
                  onClick={handleVerifyAndRegister}
                  className="medical-button w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Verify & Register"
                  )}
                </Button>
              </div>
            )}

            <div className="mt-6">
              <Separator className="mb-6" />
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={handleGoogleRegister}
              >
                <Chrome className="h-4 w-4" />
                Sign up with Google
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have a medications?{" "}
                <Link
                  to="/login"
                  className="text-medical-purple hover:underline font-semibold"
                >
                  Enter here
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
