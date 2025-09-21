
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import placeholderImages from '@/lib/placeholder-images.json';
import { SiteConfig } from '@/config/site';

export default function NotFoundPage() {
  const { notFoundBg } = placeholderImages;

  return (
    <section className="flex items-center justify-center min-h-[calc(100vh-8rem)] w-full py-10 px-4 text-center">
      <div className="container">
        <div className="max-w-lg mx-auto">
            <div 
              className="four_zero_four_bg" 
              style={{ backgroundImage: `url(${notFoundBg.src})` }}
              data-ai-hint={notFoundBg.aiHint}
              aria-label={notFoundBg.alt}
            >
              <h1 className="text-center">404</h1>
            </div>

            <div className="contant_box_404">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Look like you&apos;re lost
              </h3>

              <p className="mt-2 text-muted-foreground">
                The page you are looking for is not available!
              </p>

              <Button asChild className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
        </div>
      </div>
    </section>
  );
}
