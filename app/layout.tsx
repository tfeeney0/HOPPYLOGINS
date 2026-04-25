import type { Metadata, Viewport } from "next";
import "./globals.css";

const appName = "HoppyLogins Mail Manager";
const appDescription =
  "Aplicacion profesional para gestionar correos, sesiones y flujos de autenticacion.";

export const metadata: Metadata = {
  applicationName: appName,
  title: {
    default: appName,
    template: `%s | ${appName}`
  },
  description: appDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
