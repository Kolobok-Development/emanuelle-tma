"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { EmptyMedia } from "@/components/ui/empty";

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
    );
  }

  if (isAuthenticated && user) {
    router.push("/dashboard");
  }

// if (!isAuthenticated && !isLoading) {
//   router.push('/unauthorized');
// }

  // Fallback: Show loading while redirecting or if in unexpected state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen above-mask">
      <EmptyMedia variant="icon" className="bg-muted-foreground">
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
