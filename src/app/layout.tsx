import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastViewport from "@/components/ToastViewport";

export const metadata: Metadata = {
  title: "SynapCircuit — Electronics & Maker Store",
  description:
    "SynapCircuit is your one-stop shop for microcontrollers, sensors, robotics kits, and prototyping tools.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AppProvider>
          <Navbar />
          <div className="min-h-[60vh]">{children}</div>
          <Footer />
          <ToastViewport />
        </AppProvider>
      </body>
    </html>
  );
}
