import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export const LandingPage = () => {
  const navigate = useNavigate();
  const medKnockText = "MedKnock".split("");

  // Animation variants for the container of the letters to stagger them
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.1, // Each letter appears 0.1s after the previous one
        delayChildren: 0.5 // Start the animation after a short delay
      },
    },
  };

  // Animation variants for each individual letter
  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };


  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background text-foreground">
      {/* === Animated Background === */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#230042] via-[#7600FF] to-[#00FFF5] opacity-10 -z-10" />

      {/* Floating Orbs */}
      <motion.div
        className="fixed top-20 left-10 w-64 h-64 bg-[#FFE066]/15 rounded-full blur-3xl"
        animate={{
          y: [0, 50, 0],
          x: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="fixed bottom-20 right-10 w-96 h-96 bg-[#C1FF72]/15 rounded-full blur-3xl"
        animate={{
          y: [0, -50, 0],
          x: [0, -30, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="fixed top-1/2 left-1/2 w-80 h-80 bg-[#00FFB3]/12 rounded-full blur-3xl"
        animate={{
          y: [0, 40, 0],
          x: [0, -40, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* === Navbar === */}
      <header className="relative flex justify-between items-center px-8 py-6 border-b border-border/50 backdrop-blur-xl bg-background/80 z-10">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Sparkles className="h-8 w-8 text-[#C1FF72]" />
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#00FFF5] to-[#7600FF] bg-clip-text text-transparent">
            MedKnock
          </h1>
        </motion.div>
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link to="/login">
            <Button variant="outline" size="lg" className="rounded-xl">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="lg"
              className="rounded-xl bg-primary hover:scale-105 transition-transform"
            >
              Register
            </Button>
          </Link>
        </motion.div>
      </header>

      {/* === Hero Section === */}
      <main className="relative flex-grow flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block mb-6"
          >
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#C1FF72]/10 border border-[#C1FF72]/30 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-[#C1FF72]" />
              <span className="text-sm font-semibold">Your Health, Transformed</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Welcome to{" "}
            <motion.span 
              className="bg-gradient-to-r from-[#00FFF5] to-[#7600FF] bg-clip-text text-transparent inline-block"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              aria-label="MedKnock"
            >
              {medKnockText.map((char, index) => (
                <motion.span key={index} variants={childVariants} className="inline-block">
                  {char}
                </motion.span>
              ))}
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            Your personal alchemist for health and medicine — track, compare, and
            manage your wellness journey with precision and magical care.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.8 }}
          >
            <Button
              onClick={() => navigate("/register")}
              size="lg"
              className="rounded-xl text-lg px-10 py-6 bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:scale-105 transition-transform"
            >
              Get Started Free
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              size="lg"
              className="rounded-xl text-lg px-10 py-6"
            >
              Sign In
            </Button>
          </motion.div>
        </motion.div>

        {/* === Feature Cards === */}
        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-6xl mt-24"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.8 }}
        >
          {[
            {
              icon: <Heart className="h-7 w-7 text-background" />,
              title: "Medicines Tracking",
              desc: "Monitor medications, and wellness metrics in one enchanted dashboard.",
              from: "#FFE066",
              to: "#C1FF72",
            },
            {
              icon: <ShieldCheck className="h-7 w-7 text-background" />,
              title: "Smart Insights",
              desc: "Get personalized recommendations and alerts powered by intelligent analysis.",
              from: "#C1FF72",
              to: "#00FFB3",
            },
            {
              icon: <TrendingUp className="h-7 w-7 text-background" />,
              title: "Progress Analytics",
              desc: "Visualize your health journey with beautiful charts and meaningful trends.",
              from: "#00FFB3",
              to: "#00FFF5",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl bg-background/40 border border-border/40 hover:scale-[1.03] hover:shadow-lg transition-transform backdrop-blur-md group"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${feature.from}, ${feature.to})`,
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* === Footer === */}
      <footer className="relative text-center py-8 text-sm text-muted-foreground border-t border-border/50 backdrop-blur-xl bg-background/80">
        <p>
          © {new Date().getFullYear()} MedKnock. Crafted with care for your wellness
          journey.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;

