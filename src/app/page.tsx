'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { EmptyMedia } from '@/components/ui/empty';

export default function Home() {
  const t = useTranslations();
  const { user, isAuthenticated, isLoading } = useAppContext();
  const router = useRouter();


  if (!isAuthenticated && isLoading) {
    return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
        <EmptyMedia variant='icon' className='bg-muted-foreground'>
        <Spinner className="size-8 text-primary" />
      </EmptyMedia>
        </div>
        
        <div className="space-y-2">
          <p className="text-md font-bold text-foreground">
            {t('home.preparingSession')}
          </p>
        </div>
      </div>
    </div>
  )
  }

  if (isAuthenticated && user) {
    router.push('/dashboard');
  }

// if (!isAuthenticated && !isLoading) {
//   router.push('/unauthorized');
// }

  // Fallback: Show loading while redirecting or if in unexpected state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen above-mask">
      <EmptyMedia variant='icon' className='bg-muted-foreground'>
        <Spinner className="size-8 text-primary" />
      </EmptyMedia>
      <div className="space-y-2">
          <p className="text-md font-bold text-foreground">
             {t('home.almostThere')}
          </p>
        </div>
    </div>
  );
}


/*

<article className="prose prose-invert mx-auto max-w-md px-6 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Dark Theme Debug</h1>
        <p className="text-muted-foreground mt-2">
          This page tests the new OKLCH dark palette, typography, gradients, and
          shadcn components.
        </p>
      </header>

      <section className="relative rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="absolute inset-0 app-mask bg-gradient-pink-purple opacity-70" />
        <div className="relative z-10 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Primary
            </Button>
            <Button
              variant="outline"
              className="border border-border text-foreground hover:bg-muted/20"
            >
              Outline
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              Accent
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Typography with Space Mono</h2>
        <p>
          This text is using <code className="text-accent">Space Mono</code> font family. 
          The monospace font gives a technical, code-like appearance perfect for{" "}
          <span className="text-muted-foreground">developer tools</span> and modern interfaces.
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <code className="text-sm">
            font-family: 'Space Mono', monospace;
          </code>
        </div>

        <blockquote>
          “Good typography doesn’t shout — it guides the reader quietly.”
        </blockquote>

        <ul>
          <li>Foreground text — <span className="text-foreground">normal</span></li>
          <li>Muted text — <span className="text-muted-foreground">dimmed</span></li>
          <li>Accent color — <span className="text-accent">highlight</span></li>
        </ul>
      </section>

      <footer className="pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Background: <code>bg-background</code> • Foreground:{" "}
          <code>text-foreground</code> • Primary: <code>bg-primary</code>
        </p>
      </footer>
    </article>


*/