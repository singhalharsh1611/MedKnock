import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DarkVeil from "@/components/ui/DarkVeil";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/v1/user/forgot-password`,
        {
          email,
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
    }
    setLoading(false);
  };

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      setStep(3);
    } else {
      toast.error("Please enter a valid 6-digit OTP.");
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/v1/user/update-password`,
        {
          email,
          otp,
          password: newPassword,
        }
      );

      if (response.data.success) {
        toast.success("Password updated successfully.");
        setStep(1);
        setEmail("");
        setOtp("");
        setNewPassword("");
        navigate("/login");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Failed to update password.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen">
      {/* Background layer: full screen, behind everything, click-through */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <DarkVeil />
      </div>
      {/* Foreground content: above background */}
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold">
              {step === 1 && "Forgot Password"}
              {step === 2 && "Verify OTP"}
              {step === 3 && "Reset Password"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="medical-button w-full"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="pl-10 tracking-widest text-center font-mono"
                  />
                </div>
                <Button onClick={handleVerifyOTP} className="medical-button w-full">
                  Verify OTP
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="medical-button w-full"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </>
            )}
          </CardContent>

          {step !== 3 && (
            <CardFooter className="text-center">
              <p className="text-sm text-muted-foreground">
                Remembered your password?{" "}
                <a href="/login" className="text-primary hover:underline">
                  Login
                </a>
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
