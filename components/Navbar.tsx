"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GalleryVerticalEndIcon } from "lucide-react";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <GalleryVerticalEndIcon className="size-6 text-primary" />
                    <span>Wappin</span>
                </Link>
                <nav className="hidden md:flex gap-6 text-sm font-medium">
                    <Link href="/#features" className="hover:text-primary transition-colors">Features</Link>
                    <Link href="/#pricing" className="hover:text-primary transition-colors">Pricing</Link>
                    <Link href="/docs" className="hover:text-primary transition-colors">Docs</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" className="hidden sm:flex">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/login">Get Started</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
