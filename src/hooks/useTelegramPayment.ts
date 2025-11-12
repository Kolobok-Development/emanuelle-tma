import { useState, useCallback } from 'react';
import { openInvoice } from '@telegram-apps/sdk';


type PaymentStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseTelegramPaymentReturn {
  purchaseOffer: (offerId: string) => Promise<void>;
  status: PaymentStatus;
  error: string | null;
}

/**
 * Hook for handling Telegram Stars payments
 */
export function useTelegramPayment(): UseTelegramPaymentReturn {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);


  const purchaseOffer = useCallback(async (offerId: string) => {
    setStatus('loading');
    setError(null);

    try {
      // Step 1: Request invoice link from backend
      const response = await fetch('/api/payment/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create invoice' }));
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const { invoiceLink } = await response.json();

      if (!invoiceLink) {
        throw new Error('No invoice link received');
      }

      // Step 2: Open invoice in Telegram
        await openInvoice(invoiceLink)
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred during payment');
      console.error('Payment error:', err);
    }
  }, []);

  return {
    purchaseOffer,
    status,
    error,
  };
}

