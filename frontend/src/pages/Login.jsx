import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Chrome, Lock, Mail, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import DarkVeil from "@/components/ui/DarkVeil";

const Login = () => {
  const { login, token } = useAuth();
  if (token) return <Navigate to="/dashboard" />;
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      console.log("Login failed: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background layer: full screen, behind everything, click-through */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <DarkVeil />
      </div>

      {/* Foreground content: above background */}
      <div className=" flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-magical-purple elixir-glow" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              MedKnock
            </h1>
            <p className="text-muted-foreground">
              Welcome back to your grimoire
            </p>
          </div>

          <Card className="p-8 shadow-2xl border-2 border-magical-purple/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="alchemist@example.com"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-magical-purple hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Your secret spell"
                  className="mt-2"
                  required
                />
              </div>

              <Button
                type="submit" 
                className="magical-button w-full"
                disabled={isLoading}
              >
                {isLoading ? "Casting login spell..." : "Enter Grimoire"}
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="mb-6" />
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                New alchemist?{" "}
                <Link
                  to="/register"
                  className="text-magical-purple hover:underline font-semibold"
                >
                  Create your grimoire
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
