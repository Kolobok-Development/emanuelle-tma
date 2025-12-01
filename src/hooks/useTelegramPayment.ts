import { useState, useCallback, useEffect } from 'react';
import { invoice } from '@tma.js/sdk';
import type { InvoiceStatus } from '@tma.js/bridge';

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


  useEffect(() => {
    console.log('Status:', status);
  }, [status]);

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

      // Step 2: Open invoice and wait for user action
      // openUrl returns a BetterPromise<InvoiceStatus> that resolves when user completes the action
      const invoiceResult: InvoiceStatus = await invoice.openUrl(invoiceLink);
      
      // Handle different invoice statuses
      switch (invoiceResult) {
        case 'paid':
          setStatus('success');
          break;
        case 'failed':
        case 'cancelled':
          setStatus('error');
          setError(
            invoiceResult === 'cancelled' 
              ? 'Payment was cancelled' 
              : 'Payment failed'
          );
          break;
        case 'pending':
          // Payment is still pending, keep loading state
          // Note: This might not occur as the promise typically resolves with final status
          setStatus('loading');
          break;
        default:
          // Unknown status, treat as error
          setStatus('error');
          setError(`Unknown payment status: ${invoiceResult}`);
          break;
      }
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

