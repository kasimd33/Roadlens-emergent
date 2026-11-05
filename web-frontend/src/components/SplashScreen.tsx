import React from "react";
import { Loader2, ScanLine } from "lucide-react";

export const SplashScreen: React.FC = () => (
  <div className="min-h-svh bg-void flex flex-col items-center justify-center p-6">
    <ScanLine size={72} className="text-acid-lime" />
    <h1 className="text-paper text-3xl font-medium tracking-[-0.01em] mt-2">RoadLens</h1>
    <p className="text-fog text-sm font-normal mt-1">AI Road Damage &amp; Civic Reporting</p>
    <Loader2 size={22} className="text-acid-lime animate-spin mt-6" />
  </div>
);
