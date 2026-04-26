import React from "react";
import Link from "next/link";
import { GalleryVerticalEndIcon } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t py-12 bg-background">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <GalleryVerticalEndIcon className="size-6 text-primary" />
                    <span>Wappin</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    © 2024 Wappin. All rights reserved.
                </p>
                <div className="flex gap-6 text-sm text-muted-foreground">
                    <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Contact</Link>
                </div>
            </div>
        </footer>
    );
}
