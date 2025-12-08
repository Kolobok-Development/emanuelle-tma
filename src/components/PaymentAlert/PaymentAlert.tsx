'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface PaymentAlertProps {
  error: string | null;
  onDismiss?: () => void;
  autoCloseDelay?: number; // in milliseconds
}

export function PaymentAlert({ error, onDismiss, autoCloseDelay = 1000000 }: PaymentAlertProps) {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (error) {
      setShouldRender(true);
      // Small delay to trigger fade-in animation
      setTimeout(() => setIsVisible(true), 10);
      
      // Auto-dismiss after delay
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Remove from DOM after fade-out animation
        setTimeout(() => {
          setShouldRender(false);
          onDismiss?.();
        }, 300); // Match transition duration
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Remove from DOM after fade-out
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [error, autoCloseDelay, onDismiss]);

  if (!error || !shouldRender) {
    return null;
  }

  return (
    <div 
      className={`absolute left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-md transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-100'
      }`}
    >
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{t('errors.paymentError.title')}</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    </div>
  );
}

