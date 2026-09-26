import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const vendorLogos = {
  Netmeds: "https://cdn.netmeds.tech/v2/plain-cake-860195/original/storefront/images/netmeds_beta_logo.svg",
  "Apollo Pharmacy": "https://newassets.apollo247.com/images/ic_logo.png",
  "1mg": "https://www.1mg.com/images/tata_1mg_logo.svg",
  PharmEasy: "https://assets.pharmeasy.in/apothecary/images/logo_big.svg",
};

const fetchUserSchedules = async () => {
  const token = localStorage.getItem("token");
  if (!token) return [];
  const res = await axios.get(`${BACKEND_URL}/api/v1/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.items || [];
};

const fetchPriceComparison = async (medicineName) => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/webScrape/${encodeURIComponent(medicineName)}`
  );
  return res.data;
};

const Card = ({ className, children }) => (
  <div className={cn("border bg-card text-card-foreground shadow-sm rounded-xl p-6", className)}>
    {children}
  </div>
);

const ShadcnSelect = ({ value, onChange, disabled, options, placeholder }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full h-10 pl-3 pr-10 text-base border rounded-lg appearance-none focus:ring-2 focus:ring-medical-purple bg-card text-card-foreground"
    >
      {options.length === 0 ? (
        <option className="text-black bg-white">{placeholder}</option>
      ) : (
        options.map((option) => (
          <option className="text-black bg-white" key={option.value} value={option.value}>
            {option.label}
          </option>
        ))
      )}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </div>
  </div>
);

const PriceCard = ({ result }) => {
  if (!result) return null;
  const logoUrl = vendorLogos[result.vendor] || "https://placehold.co/120x40/e2e8f0/64748b?text=Logo";
  return (
    <Card className="group flex flex-col justify-between transition-shadow hover:shadow-lg">
      <div>
        <div className="flex justify-center items-center mb-4 h-14">
          <img
            src={logoUrl}
            alt={`${result.vendor} logo`}
            className="max-h-10 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/120x40/e2e8f0/64748b?text=Logo";
            }}
          />
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-foreground mb-2 truncate">{result.productName}</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-medical-purple" />
            <p className="font-bold text-2xl text-indigo-600 dark:text-medical-purple">
              {result.price || "N/A"}
            </p>
          </div>
        </div>
      </div>
      <Button asChild className="w-full">
        <a href={result.productUrl} target="_blank" rel="noopener noreferrer">
          Visit Store
        </a>
      </Button>
    </Card>
  );
};

const Compare = () => {
  const [schedules, setSchedules] = useState([]);
  const [isSchedulesLoaded, setIsSchedulesLoaded] = useState(false);
  const [selectedPill, setSelectedPill] = useState("");
  const [comparisonResults, setComparisonResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Load user schedules on mount
  useEffect(() => {
    fetchUserSchedules()
      .then((data) => {
        setSchedules(data);
        setIsSchedulesLoaded(true);
      })
      .catch(() => {
        setError("Could not load schedules. Please make sure you are logged in.");
        setIsSchedulesLoaded(true);
      });
  }, []);

  const handleSearch = async () => {
    if (!selectedPill) return;

    setIsLoading(true);
    setError(null);
    setComparisonResults([]);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 10 : prev));
    }, 400);

    try {
      const data = await fetchPriceComparison(selectedPill);
      setComparisonResults(data.results);
    } catch {
      setError(`Failed to get prices for ${selectedPill}. The medicals are busy.`);
    } finally {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const scheduleOptions = schedules.map((s) => ({ value: s.pillName, label: s.pillName }));

  return (
    <div className="font-sans min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Dropdown */}
        <Card className="mb-4 max-w-sm">
          <label htmlFor="pill-select" className="block text-lg font-medium text-card-foreground mb-2">
            Select a Medicine to Compare Prices
          </label>
          <ShadcnSelect
            value={selectedPill}
            onChange={(e) => {
              setSelectedPill(e.target.value);
              handleSearch(); // Trigger search when dropdown changes
            }}
            disabled={schedules.length === 0 || isLoading}
            options={scheduleOptions}
            placeholder={!isSchedulesLoaded ? "Loading your medicines..." : schedules.length === 0 ? "No medicines scheduled" : "Select a medicine"}
          />
        </Card>

        {/* Search input + button */}
        <div className="mb-8 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type medicine name..."
            value={selectedPill}
            onChange={(e) => setSelectedPill(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(); // Trigger search on Enter
            }}
            className="flex-1 max-w-xs px-3 py-2 border rounded-lg text-card-foreground bg-card focus:ring-2 focus:ring-medical-purple"
          />
          <Button onClick={handleSearch} disabled={!selectedPill || isLoading} className="h-10">
            Search
          </Button>
        </div>

        {/* Progress */}
        {isLoading && (
          <div className="w-full max-w-2xl mx-auto mb-8">
            <Progress value={progress} className="h-4 w-full" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center p-10 bg-red-100 border border-red-300 text-red-800 rounded-xl shadow-md">
            <p>{error}</p>
          </div>
        )}

        {/* Price Cards */}
        {!isLoading && !error && comparisonResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {comparisonResults.map((result, idx) => (
              <PriceCard key={idx} result={result} />
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && !error && comparisonResults.length === 0 && selectedPill && (
          <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-xl shadow-md">
            <p className="text-slate-500">No prices found for {selectedPill}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compare;
