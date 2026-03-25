import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const appSans = Manrope({
    variable: "--font-app-sans",
    subsets: ["latin"],
});

const appMono = JetBrains_Mono({
    variable: "--font-app-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "EduSmart | YouLearn Workspace",
    description: "AI learning workspace with markdown, coding playground, and online PDF study view.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${appSans.variable} ${appMono.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
