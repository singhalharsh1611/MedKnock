import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Home } from "lucide-react";
import FaultyTerminal from "@/components/FaultyTerminal";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
<div
  style={{
    width: "100%",
    height: "100vh",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  }}
>
  <FaultyTerminal
    scale={1.5}
    gridMul={[3, 2]}
    digitSize={1.9}
    timeScale={1}
    pause={false}
    scanlineIntensity={0.5}
    glitchAmount={1}
    flickerAmount={1}
    noiseAmp={1}
    chromaticAberration={0}
    dither={0}
    curvature={0.1}
    tint="#64b846"
    mouseReact={true}
    mouseStrength={0.5}
    pageLoadAnimation={false}
    brightness={1}
  />

  <Card
    className="p-12 text-center max-w-md w-full shadow-2xl z-10"
    style={{
      background: "rgba(255, 255, 255, 0.03)",
      backdropFilter: "blur(3px)",
      position: "absolute", 
    }}
  >
    <div className="flex justify-center mb-6">
      <Sparkles className="h-16 w-16 text-magical-purple elixir-glow" />
    </div>

    <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
    <h2 className="text-xl font-semibold text-foreground mb-4">
      Page Not Found
    </h2>
    <p className="text-muted-foreground mb-8">
      It seems this page has vanished into the magical mist. Let's get back
      to the grimoire.
    </p>

    <Button asChild className="magical-button">
      <a href="/dashboard" className="flex items-center gap-2">
        <Home className="h-4 w-4" />
        Return to Dashboard
      </a>
    </Button>
  </Card>
</div>

  );
};

export default NotFound;