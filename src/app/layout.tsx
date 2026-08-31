import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "PromptGrid",
  description: "A functional, minimalist prompt manager.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PromptGrid",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased overflow-hidden selection:bg-indigo-500/30">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && (
          <Script id="pwa-bootstrap" strategy="beforeInteractive">
            {`
              window.deferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredPwaPrompt = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('ServiceWorker error: ', err);
                  });
                });
              }
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
