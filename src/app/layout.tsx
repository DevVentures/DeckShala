import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CollaborationProvider } from "@/hooks/globals/use-collaboration";
import NextAuthProvider from "@/provider/NextAuthProvider";
import TanStackQueryProvider from "@/provider/TanstackProvider";
import { ThemeProvider } from "@/provider/theme-provider";
import "@/styles/globals.css";
import { type Metadata } from "next";
import { Inter } from "next/font/google";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SlideMind – AI Presentation Generator",
    template: "%s | SlideMind",
  },
  description:
    "Create stunning, professional presentations in seconds with AI. Generate slides, themes, and speaker notes automatically.",
  keywords: [
    "AI presentation",
    "slide generator",
    "PowerPoint AI",
    "presentation maker",
    "AI slides",
  ],
  authors: [{ name: "SlideMind" }],
  creator: "SlideMind",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "SlideMind – AI Presentation Generator",
    description:
      "Create stunning, professional presentations in seconds with AI.",
    siteName: "SlideMind",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlideMind – AI Presentation Generator",
    description:
      "Create stunning, professional presentations in seconds with AI.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TanStackQueryProvider>
      <NextAuthProvider>
        <CollaborationProvider>
          <html lang="en">
            <body className={`${inter.className} antialiased`}>
              <ErrorBoundary>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                >
                  {children}
                </ThemeProvider>
              </ErrorBoundary>
            </body>
          </html>
        </CollaborationProvider>
      </NextAuthProvider>
    </TanStackQueryProvider>
  );
}
