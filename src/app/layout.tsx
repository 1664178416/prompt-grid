import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import CommandPalette from "@/components/command-palette/CommandPalette";

export const metadata: Metadata = {
  title: "PromptGrid",
  description: "A functional, minimalist prompt manager.",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PromptGrid",
  },
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
          <CommandPalette />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </body>
    </html>
  );
}
