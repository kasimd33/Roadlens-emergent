import React from "react";
import { Loader2, ScanLine } from "lucide-react";

export const SplashScreen: React.FC = () => (
  <div className="min-h-svh bg-[#1E3A8A] flex flex-col items-center justify-center p-6">
    <ScanLine size={72} className="text-white" />
    <h1 className="text-white text-3xl font-black tracking-widest mt-2">RoadLens</h1>
    <p className="text-blue-200 text-sm font-medium mt-1">AI Road Damage &amp; Civic Reporting</p>
    <Loader2 size={22} className="text-white animate-spin mt-6" />
  </div>
);
