import { PresentationGenerationManager } from "@/components/presentation/dashboard/PresentationGenerationManager";
import PresentationHeader from "@/components/presentation/presentation-page/PresentationHeader";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Create, manage, and present AI-generated presentations from your personal dashboard.",
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PresentationGenerationManager />
      <div className="flex h-screen w-screen flex-col supports-[(height:100dvh)]:h-[100dvh]">
        <PresentationHeader />
        <main className="relative flex flex-1 overflow-hidden">
          <div className="sheet-container h-[calc(100vh-3.8rem)] flex-1 place-items-center overflow-y-auto overflow-x-clip supports-[(height:100dvh)]:h-[calc(100dvh-3.8rem)]">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
