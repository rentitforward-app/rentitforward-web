import type { Metadata } from "next";
import { Inter, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Providers from "../components/Providers";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Rent It Forward - Share More, Buy Less",
  description: "A modern rental marketplace for tools, gear, electronics, and other items. Rent from your community and promote sustainable living.",
  keywords: "rental, marketplace, tools, electronics, gear, sharing economy, sustainable living, Australia",
  authors: [{ name: "Rent It Forward Team" }],
  creator: "Rent It Forward",
  publisher: "Rent It Forward",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://rentitforward.com.au"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: '/images/RIF_favicon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/images/RIF_favicon.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/images/RIF_favicon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },

  openGraph: {
    title: "Rent It Forward - Share More, Buy Less",
    description: "A modern rental marketplace for tools, gear, electronics, and other items.",
    url: "https://rentitforward.com.au",
    siteName: "Rent It Forward",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent It Forward - Share More, Buy Less",
    description: "A modern rental marketplace for tools, gear, electronics, and other items.",
    creator: "@rentitforward",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${roboto.variable}`}>
      <head>
        {/* OneSignal Web Push SDK */}
        <script 
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
          defer 
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                  allowLocalhostAsSecureOrigin: true,
                });
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-gray-50`}>
        <Providers>
          <div id="root" className="relative flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#44D62C',
                },
              },
              error: {
                style: {
                  background: '#f87171',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
