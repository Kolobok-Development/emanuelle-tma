import { useState, useCallback } from 'react';
import { invoice } from '@tma.js/sdk';
import type { InvoiceStatus } from '@tma.js/bridge';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { trackPaymentFailed, trackPaymentAbandoned } from '@/lib/analytics';

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
  const t = useTranslations();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const purchaseOffer = useCallback(async (offerId: string) => {
    setStatus('loading');
    setError(null);

    // Dismiss any existing payment toasts to ensure clean state
    toast.dismiss('payment-loading');
    toast.dismiss('payment-success');
    toast.dismiss('payment-failed');
    toast.dismiss('payment-cancelled');
    toast.dismiss('payment-pending');
    toast.dismiss('payment-unknown');
    toast.dismiss('payment-error');

    try {
      // Step 1: Show loading toast when creating invoice
      toast.loading(t('payment.processing'), {
        id: 'payment-loading',
        style: {
          background: 'oklch(0.28 0.025 305)',
          color: 'oklch(0.96 0.02 310)',
          border: '1px solid oklch(0.42 0.03 305)',
          borderRadius: '0.75rem',
          padding: '0.875rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
        duration: Infinity,
        icon: '💫 ' // Keep it until we dismiss it
      });

      // Step 2: Request invoice link from backend
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

      // Step 3: Dismiss loading toast when invoice is shown
      toast.dismiss('payment-loading');

      // Step 4: Open invoice and wait for user action
      // openUrl returns a BetterPromise<InvoiceStatus> that resolves when user completes the action
      const invoiceResult: InvoiceStatus = await invoice.openUrl(invoiceLink);
      
      // Step 5: Handle different invoice statuses with appropriate toasts
      switch (invoiceResult) {
        case 'paid':
          setStatus('success');
          toast.success(t('payment.success'), {
            id: 'payment-success',
            style: {
              background: 'oklch(0.28 0.025 305)',
              color: 'oklch(0.96 0.02 310)',
              border: '1px solid oklch(0.62 0.26 300)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            duration: 4000,
            icon: '🎉',
          });
          break;
        case 'failed':
          setStatus('error');
          setError('Payment failed');
          // Track payment failure
          trackPaymentFailed(offerId, 'Payment failed');
          toast.error(t('payment.failed'), {
            id: 'payment-failed',
            style: {
              background: 'oklch(0.28 0.025 305)',
              color: 'oklch(0.96 0.02 310)',
              border: '1px solid oklch(0.65 0.23 25)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            duration: 4000,
            icon: '❌',
          });
          break;
        case 'cancelled':
          setStatus('error');
          setError('Payment was cancelled');
          // Track payment abandonment
          trackPaymentAbandoned(offerId, 'unknown', 0);
          toast.error(t('payment.cancelled'), {
            id: 'payment-cancelled',
            style: {
              background: 'oklch(0.28 0.025 305)',
              color: 'oklch(0.96 0.02 310)',
              border: '1px solid oklch(0.65 0.23 25)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            duration: 4000,
            icon: '🚫',
          });
          break;
        case 'pending':
          // Payment is still pending, keep loading state
          // Note: This might not occur as the promise typically resolves with final status
          setStatus('loading');
          toast.loading(t('payment.pending'), {
            id: 'payment-pending',
            style: {
              background: 'oklch(0.28 0.025 305)',
              color: 'oklch(0.96 0.02 310)',
              border: '1px solid oklch(0.42 0.03 305)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            duration: Infinity,
            icon: '⏳',
          });
          break;
        default:
          // Unknown status, treat as error
          setStatus('error');
          setError(`Unknown payment status: ${invoiceResult}`);
          toast.error(t('payment.unknownError'), {
            id: 'payment-unknown',
            style: {
              background: 'oklch(0.28 0.025 305)',
              color: 'oklch(0.96 0.02 310)',
              border: '1px solid oklch(0.65 0.23 25)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            duration: 4000,
            icon: '⚠️',
          });
          break;
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during payment';
      setError(errorMessage);
      console.error('Payment error:', err);
      
      // Track payment failure
      trackPaymentFailed(offerId, errorMessage);
      
      // Dismiss loading toast if it's still showing
      toast.dismiss('payment-loading');
      
      // Show error toast
      toast.error(t('payment.generalError'), {
        id: 'payment-error',
        style: {
          background: 'oklch(0.28 0.025 305)',
          color: 'oklch(0.96 0.02 310)',
          border: '1px solid oklch(0.65 0.23 25)',
          borderRadius: '0.75rem',
          padding: '0.875rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
        duration: 4000,
      });
    }
  }, [t]);

  return {
    purchaseOffer,
    status,
    error,
  };
}

