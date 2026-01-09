'use client';

import { sendGTMEvent } from '@next/third-parties/google';

/**
 * Track companion selection on dashboard (for popularity analysis)
 */
export function trackCompanionSelected(companionId: string, companionName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: companion_selected', { companionId, companionName });
  }

  sendGTMEvent({
    event: 'companion_selected',
    companion_id: companionId,
    companion_name: companionName,
  });
}

/**
 * Track companion detail page view (funnel step 1)
 */
export function trackCompanionDetailViewed(companionId: string, companionName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: companion_detail_viewed', { companionId, companionName });
  }

  sendGTMEvent({
    event: 'companion_detail_viewed',
    companion_id: companionId,
    companion_name: companionName,
  });
}

/**
 * Track chat initiation (funnel step 2 - conversion)
 */
export function trackChatInitiated(companionId: string, companionName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: chat_initiated', { companionId, companionName });
  }

  sendGTMEvent({
    event: 'chat_initiated',
    companion_id: companionId,
    companion_name: companionName,
  });
}

/**
 * Track chat initiation failure
 */
export function trackChatInitiationFailed(companionId: string, error: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: chat_initiation_failed', { companionId, error });
  }

  sendGTMEvent({
    event: 'chat_initiation_failed',
    companion_id: companionId,
    error_reason: error,
  });
}

/**
 * Track offer view (payment funnel step 1 - Enhanced Ecommerce)
 */
export function trackOfferViewed(offerId: string, offerType: string, price: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: view_item', { offerId, offerType, price });
  }

  sendGTMEvent({
    event: 'view_item',
    ecommerce: {
      items: [{
        item_id: offerId,
        item_name: offerType,
        price: price,
        currency: 'USD',
        item_category: offerType,
      }],
    },
  });
}

/**
 * Track payment initiation (payment funnel step 2 - Enhanced Ecommerce)
 */
export function trackPaymentInitiated(offerId: string, offerType: string, amount: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: begin_checkout', { offerId, offerType, amount });
  }

  sendGTMEvent({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'XTR',
      value: amount,
      items: [{
        item_id: offerId,
        item_name: offerType,
        price: amount,
        quantity: 1,
      }],
    },
  });
}

/**
 * Track payment completion (payment funnel step 3 - Enhanced Ecommerce)
 */
export function trackPaymentCompleted(
  transactionId: string,
  offerId: string,
  offerType: string,
  amount: number,
  diamonds?: number,
  energy?: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: purchase', { transactionId, offerId, offerType, amount, diamonds, energy });
  }

  sendGTMEvent({
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'XTR',
      value: amount,
      items: [{
        item_id: offerId,
        item_name: offerType,
        price: amount,
        quantity: 1,
      }],
    },
    diamonds_awarded: diamonds,
    energy_awarded: energy,
  });
}

/**
 * Track payment failure
 */
export function trackPaymentFailed(offerId: string, errorReason: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: payment_failed', { offerId, errorReason });
  }

  sendGTMEvent({
    event: 'payment_failed',
    item_id: offerId,
    error_reason: errorReason,
  });
}

/**
 * Track payment abandonment
 */
export function trackPaymentAbandoned(offerId: string, offerType: string, amount: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics: payment_abandoned', { offerId, offerType, amount });
  }

  sendGTMEvent({
    event: 'payment_abandoned',
    item_id: offerId,
    item_name: offerType,
    value: amount,
  });
}

