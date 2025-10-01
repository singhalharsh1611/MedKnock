import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Lock, User, Chrome } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import DarkVeil from "@/components/ui/DarkVeil";

const Register = () => {
  const { register, token } = useAuth();
  if (token) return <Navigate to='/dashboard' />
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    setIsLoading(true);

    try {
      // Call register function from AuthContext
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      // Navigation happens inside register()
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }



  };

  const handleGoogleRegister = () => {
    toast("Google authentication coming soon!");
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
              <Sparkles className="h-12 w-12 text-magical-purple elixir-glow" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              MedKnock
            </h1>
            <p className="text-muted-foreground">
              Create your alchemist grimoire
            </p>
          </div>

          <Card className="p-8 shadow-2xl border-2 border-magical-purple/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label
                  htmlFor="firstName"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="First name"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  className="mt-2"
                  required
                />
              </div>


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
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Create a secret spell"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Confirm Password
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
                  placeholder="Confirm your secret spell"
                  className="mt-2"
                  required
                />
              </div>

              <Button
                type="submit"
                className="magical-button w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating grimoire..." : "Create Grimoire"}
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="mb-6" />

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={handleGoogleRegister}
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4" />
                Sign up with Google
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have a grimoire?{" "}
                <Link
                  to="/login"
                  className="text-magical-purple hover:underline font-semibold"
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
