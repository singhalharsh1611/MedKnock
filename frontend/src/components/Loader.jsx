// components/Loader.jsx
import React from "react";

const Loader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default Loader;
