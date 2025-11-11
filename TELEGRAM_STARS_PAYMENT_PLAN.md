# Telegram Stars Payment Integration Plan

## Executive Summary

This document outlines the comprehensive plan for integrating Telegram Stars payment system into the mini app. The integration will allow users to purchase diamonds, energy, and combo packages using Telegram's native Stars currency.

**Key Integration Points**:
- **Offer Management**: All offers (COMBO, ENERGY, DIAMOND) will be stored in database via `Offer` model
- **Payment Flow**: Users purchase offers → Backend creates invoice → Telegram processes payment → Webhook updates balance
- **Database Structure**: New `Offer` and `PaymentTransaction` models track all payment activity
- **Frontend**: Balance page will fetch offers from API instead of hardcoded data

---

## 1. Understanding Telegram Stars Payment System

### Key Concepts:
- **Telegram Stars (XTR)**: Telegram's native in-app currency
- **Invoice Links**: Generated server-side using Bot API's `createInvoiceLink` method
- **Payment Flow**: 
  1. User clicks "Buy" → Frontend requests invoice link from backend
  2. Backend creates invoice via Telegram Bot API
  3. Frontend opens invoice using `WebApp.openInvoice()` method
  4. User completes payment in Telegram's native payment interface
  5. Telegram sends webhook/callback with payment confirmation
  6. Backend processes payment and updates user balance

### Important Details:
- **Currency Code**: `"XTR"` for Telegram Stars
- **Provider Token**: Empty string `""` for Stars payments (no external provider needed)
- **Invoice Method**: `createInvoiceLink` from Telegram Bot API
- **Frontend Method**: `WebApp.openInvoice(invoiceLink, callback)` from Telegram WebApp SDK
- **Payment Confirmation**: Via `pre_checkout_query` and `successful_payment` webhook events

---

## 2. Current Application Analysis

### Existing Infrastructure:
✅ Next.js 15 with TypeScript  
✅ `@telegram-apps/sdk-react` for Telegram integration  
✅ Prisma ORM with PostgreSQL database  
✅ JWT-based authentication system  
✅ Balance page UI with offer cards (ready for integration)  
✅ SubscriptionHistory model (can track payments)  

### What's Missing:
❌ Backend API endpoint to create invoice links  
❌ Telegram Bot API integration  
❌ Frontend payment flow implementation  
❌ Webhook handler for payment confirmations  
❌ User balance tracking (diamonds/energy)  
❌ Payment status management  
❌ API endpoint to fetch offers from database  
❌ Offer management system (currently hardcoded in UI)  

---

## 3. Architecture Overview

```
┌─────────────────┐
│   User clicks   │
│   "Buy" button  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Frontend: Balance Page         │
│  - Calls /api/payments/create   │
│  - Receives invoiceLink         │
│  - Opens invoice via WebApp     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backend API Route              │
│  /api/payments/create           │
│  - Creates invoice via Bot API  │
│  - Returns invoiceLink          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Telegram Bot API               │
│  createInvoiceLink()            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User completes payment         │
│  in Telegram interface          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Webhook Handler                │
│  /api/payments/webhook          │
│  - Receives payment confirmation │
│  - Updates user balance         │
│  - Creates transaction record    │
└─────────────────────────────────┘
```

---

## 4. Implementation Steps

### Phase 1: Database Schema Updates

**File**: `prisma/schema.prisma`

**Changes Needed**:
1. Add `diamonds` and `energy` fields to `Users` model
2. Create `Offer` model to store all offer types (COMBO, ENERGY, DIAMOND)
3. Create `PaymentTransaction` model to track all payment attempts
4. Add relation between PaymentTransaction and Offer

**Complete Schema Updates**:

```prisma
model Users {
  // ... existing fields
  diamonds              Int                   @default(0)
  energy                Int                   @default(0)
  payment_transactions  PaymentTransaction[]
  // ... rest of existing fields
}

model Offer {
  id                String              @id @default(uuid())
  offer_type        OfferType           // COMBO, ENERGY, or DIAMOND
  title             String               // e.g., "Basic", "Standard", "Pro+"
  description       String?              // Optional description
  price_in_stars    Int                  // Price in Telegram Stars
  diamonds          Int                   @default(0) // Amount of diamonds included
  energy            Int                   @default(0) // Amount of energy included
  display_order     Int                   @default(0) // Order for display in UI
  is_active         Boolean               @default(true) // Enable/disable offers
  is_featured       Boolean               @default(false) // Highlight special offers
  created_at        DateTime              @default(now())
  updated_at        DateTime              @updatedAt
  payment_transactions PaymentTransaction[]
  
  @@index([offer_type, is_active])
  @@index([display_order])
}

model PaymentTransaction {
  id                String   @id @default(uuid())
  user_id           String
  offer_id          String?  // Reference to the offer purchased (nullable)
  invoice_id        String?  // Telegram invoice ID
  payload           String?  // JSON payload for tracking (can store offer details)
  amount            Int      // Amount in Stars
  status            PaymentStatus @default(PENDING)
  telegram_payload  String?  // Full Telegram payment payload (JSON)
  error_message     String?  // Error message if payment failed
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  completed_at      DateTime?
  user              Users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  offer             Offer?   @relation(fields: [offer_id], references: [id], onDelete: SetNull)
  
  @@index([user_id])
  @@index([invoice_id])
  @@index([status])
  @@index([offer_id])
}

enum OfferType {
  COMBO
  ENERGY
  DIAMOND
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}
```

**Key Features of Offer Model**:
- **offer_type**: Distinguishes between COMBO (diamonds + energy), ENERGY-only, and DIAMOND-only offers
- **price_in_stars**: Stores price directly in Telegram Stars (no conversion needed)
- **diamonds/energy**: Amounts included in the offer (0 for single-type offers)
- **display_order**: Controls sorting order in UI
- **is_active**: Allows enabling/disabling offers without deleting them
- **is_featured**: Can highlight special or promotional offers

**Migration Command**: `npx prisma migrate dev --name add_payment_system`

**Initial Data Seeding**:
After migration, create a seed script to populate initial offers based on the current UI:
- 4 COMBO offers (Basic, Standard, Amateur, Pro+)
- 4 ENERGY offers (matching the combo amounts)
- 4 DIAMOND offers (matching the combo amounts)

---

### Phase 2: Environment Variables

**File**: `.env` (or `.env.local`)

**Required Variables**:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_KEY=your_bot_key_here  # Already exists

# Webhook Configuration
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=https://your-domain.com/api/payments/webhook
```

**Note**: Get bot token from [@BotFather](https://t.me/botfather)

---

### Phase 3: Backend Implementation

#### 3.1 Install Required Dependencies

```bash
npm install node-telegram-bot-api
# or
npm install telegraf
```

**Recommendation**: Use `node-telegram-bot-api` for simplicity, or `telegraf` if you plan to build a full bot.

#### 3.2 Create Telegram Bot API Service

**File**: `src/core/telegram/bot-api.ts`

**Purpose**: Wrapper for Telegram Bot API calls

**Implementation**:
```typescript
// Service to interact with Telegram Bot API
// Handles invoice creation and payment verification
```

#### 3.3 Create Offers API Route

**File**: `src/app/api/offers/route.ts`

**Endpoint**: `GET /api/offers`

**Query Parameters**:
- `type` (optional): Filter by offer type (COMBO, ENERGY, DIAMOND)
- `active` (optional): Filter by active status (default: true)

**Response**:
```json
{
  "success": true,
  "offers": [
    {
      "id": "uuid",
      "offer_type": "COMBO",
      "title": "Basic",
      "description": null,
      "price_in_stars": 100,
      "diamonds": 100,
      "energy": 100,
      "display_order": 0,
      "is_active": true,
      "is_featured": false
    }
  ]
}
```

**Functionality**:
1. Query offers from database
2. Filter by type and active status
3. Order by display_order
4. Return formatted offers array

#### 3.4 Create Invoice API Route

**File**: `src/app/api/payments/create/route.ts`

**Endpoint**: `POST /api/payments/create`

**Request Body**:
```json
{
  "offerId": "uuid-of-offer-from-database"
}
```

**Response**:
```json
{
  "success": true,
  "invoiceLink": "https://t.me/invoice/..."
}
```

**Functionality**:
1. Authenticate user (verify JWT session)
2. Fetch offer from database using offerId
3. Validate offer exists and is active
4. Create invoice link via Telegram Bot API using offer data
5. Store pending transaction in database with offer reference
6. Return invoice link to frontend

**Invoice Creation Details**:
- Use `offer.price_in_stars` for amount
- Use `offer.title` for invoice title
- Use `offer.description` or generate description from diamonds/energy
- Include offer_id in payload for tracking

#### 3.5 Create Webhook Handler

**File**: `src/app/api/payments/webhook/route.ts`

**Endpoint**: `POST /api/payments/webhook`

**Functionality**:
1. Verify webhook signature (if Telegram provides one)
2. Handle `pre_checkout_query` events
3. Handle `successful_payment` events
4. Find related PaymentTransaction by invoice_id
5. Fetch offer details from PaymentTransaction.offer_id
6. Update user balance (diamonds/energy) from offer amounts
7. Update transaction status to COMPLETED
8. Create subscription history entry (if applicable)

**Security**: 
- Verify webhook comes from Telegram
- Validate payment data integrity
- Prevent duplicate processing

---

### Phase 4: Frontend Implementation

#### 4.1 Create Payment Hook

**File**: `src/hooks/useTelegramPayment.ts`

**Purpose**: Custom hook to handle payment flow

**Functionality**:
- Access Telegram WebApp SDK
- Handle invoice opening
- Manage payment status
- Handle payment callbacks

#### 4.2 Update Balance Page

**File**: `src/app/(protected)/balance/page.tsx`

**Changes Needed**:
1. **Fetch offers from API** instead of hardcoded array
2. Group offers by type (COMBO, ENERGY, DIAMOND) for tabs
3. Add payment handler to "Buy" buttons
4. Integrate `useTelegramPayment` hook
5. Show loading states during payment
6. Handle payment success/failure
7. Refresh user balance after successful payment

**Updated Component Structure**:
```typescript
// Replace hardcoded comboOffers with API fetch
const [offers, setOffers] = useState<Offer[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Fetch all offers from API
  fetch('/api/offers')
    .then(res => res.json())
    .then(data => {
      setOffers(data.offers);
      setLoading(false);
    });
}, []);

// Filter offers by type for each tab
const comboOffers = offers.filter(o => o.offer_type === 'COMBO');
const energyOffers = offers.filter(o => o.offer_type === 'ENERGY');
const diamondOffers = offers.filter(o => o.offer_type === 'DIAMOND');
```

**Payment Flow**:
```typescript
const handlePurchase = async (offer: Offer) => {
  try {
    // 1. Request invoice link from backend using offer ID
    const response = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include session cookie
      body: JSON.stringify({
        offerId: offer.id // Use database offer ID
      })
    });
    
    const { invoiceLink } = await response.json();
    
    // 2. Open invoice in Telegram
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          // 3. Handle successful payment
          handlePaymentSuccess(offer);
          // Refresh offers and user balance
          refreshData();
        } else {
          // Handle payment failure/cancellation
          handlePaymentFailure();
        }
      });
    }
  } catch (error) {
    // Handle error
  }
};
```

#### 4.3 Access Telegram WebApp SDK

**Option 1**: Use `@telegram-apps/sdk-react` if it exposes `openInvoice`
**Option 2**: Access global `window.Telegram.WebApp` directly
**Option 3**: Use `@twa-dev/sdk` if needed

**Check**: Verify if `@telegram-apps/sdk-react` has payment methods, otherwise use global object.

---

### Phase 5: Webhook Setup

#### 5.1 Configure Bot Webhook

**Method**: Use Telegram Bot API to set webhook URL

**Endpoint**: `setWebhook`

**Command** (can be done via API or script):
```typescript
// Script to set webhook
// src/scripts/set-webhook.ts
```

#### 5.2 Webhook Security

**Implementation**:
- Verify webhook signature (if provided by Telegram)
- Validate request origin
- Rate limiting
- Idempotency checks (prevent duplicate processing)

---

### Phase 6: Error Handling & Edge Cases

#### Scenarios to Handle:
1. **Payment Timeout**: User doesn't complete payment
2. **Payment Cancellation**: User cancels payment
3. **Network Failures**: API calls fail
4. **Duplicate Payments**: Same invoice paid twice
5. **Invalid Invoices**: Invoice expired or invalid
6. **User Balance Issues**: Insufficient balance handling

#### Error Messages:
- Clear user-facing error messages
- Logging for debugging
- Retry mechanisms where appropriate

---

### Phase 7: Testing Strategy

#### 7.1 Unit Tests
- Test invoice creation logic
- Test payment processing logic
- Test balance updates

#### 7.2 Integration Tests
- Test full payment flow
- Test webhook handling
- Test error scenarios

#### 7.3 Manual Testing
- Test in Telegram test environment
- Test with real Stars (small amounts)
- Test different offer types
- Test payment cancellation

---

### Phase 8: Price Configuration & Offer Seeding

#### 8.1 Stars Pricing Strategy

**Current Offers** (from balance page UI):
- **COMBO Offers**: Basic ($100), Standard ($250), Amateur ($500), Pro+ ($1000)
- **ENERGY Offers**: Same 4 tiers with energy amounts matching combo
- **DIAMOND Offers**: Same 4 tiers with diamond amounts matching combo

**Pricing Decision**:
- Need to determine Stars-to-USD conversion rate or set Stars prices directly
- **Recommendation**: Set prices directly in Stars based on market research
- Example conversion: 1 Star ≈ $0.01, so $100 = 10,000 Stars (verify actual rate)

#### 8.2 Offer Seeding Script

**File**: `prisma/seed.ts` (or create migration with seed data)

**Purpose**: Populate initial offers in database based on current UI

**Seed Data Structure**:
```typescript
const initialOffers = [
  // COMBO Offers
  { offer_type: 'COMBO', title: 'Basic', price_in_stars: 10000, diamonds: 100, energy: 100, display_order: 0 },
  { offer_type: 'COMBO', title: 'Standard', price_in_stars: 25000, diamonds: 250, energy: 250, display_order: 1 },
  { offer_type: 'COMBO', title: 'Amateur', price_in_stars: 50000, diamonds: 500, energy: 500, display_order: 2 },
  { offer_type: 'COMBO', title: 'Pro+', price_in_stars: 100000, diamonds: 1000, energy: 1000, display_order: 3 },
  
  // ENERGY Offers (same structure, energy only)
  { offer_type: 'ENERGY', title: 'Basic', price_in_stars: 5000, diamonds: 0, energy: 100, display_order: 0 },
  // ... etc
  
  // DIAMOND Offers (same structure, diamonds only)
  { offer_type: 'DIAMOND', title: 'Basic', price_in_stars: 5000, diamonds: 100, energy: 0, display_order: 0 },
  // ... etc
];
```

**Note**: Adjust `price_in_stars` values based on actual Stars pricing strategy and conversion rates.

#### 8.3 Price Management

**Storage**: Prices are stored in database (`Offer.price_in_stars`)

**Benefits**:
- ✅ Can update prices without code deployment
- ✅ Can enable/disable offers dynamically
- ✅ Can add new offers via admin panel or database
- ✅ Can track which offers are most popular

**Future Enhancement**: Create admin API/UI to manage offers

---

## 5. Implementation Checklist

### Backend
- [*] Install Telegram Bot API library
- [] Add database fields (diamonds, energy to Users)
- [*] Create Offer model in schema
- [*] Create PaymentTransaction model
- [*] Run database migration
- [*] Create seed script for initial offers
- [*] Create `/api/offers` route (GET offers)
- [*] Create `/api/payments/create` route
- [*] Create `/api/payments/webhook` route
- [*] Add webhook signature verification
- [ ] Add transaction logging
- [ ] Add error handling

### Frontend
- [ ] Create `useTelegramPayment` hook
- [ ] Update Balance page to fetch offers from API
- [ ] Replace hardcoded offers with API data
- [ ] Group offers by type for tabs (COMBO, ENERGY, DIAMOND)
- [ ] Add payment handlers to "Buy" buttons
- [ ] Add loading states
- [ ] Add success/error notifications
- [ ] Add balance refresh after payment
- [ ] Test payment flow

### Configuration
- [ ] Get Telegram bot token from BotFather
- [ ] Add bot token to environment variables
- [ ] Configure webhook URL
- [ ] Set up webhook endpoint
- [ ] Test webhook connectivity

### Testing
- [ ] Test invoice creation
- [ ] Test payment flow end-to-end
- [ ] Test webhook handling
- [ ] Test error scenarios
- [ ] Test with real Stars (small amount)

### Documentation
- [ ] Document API endpoints
- [ ] Document webhook payload structure
- [ ] Document error codes
- [ ] Update README with payment setup

---

## 6. Security Considerations

### 1. Authentication
- ✅ All payment endpoints require valid JWT session
- ✅ Verify user ownership of transactions

### 2. Payment Verification
- ✅ Verify webhook signatures
- ✅ Validate payment data from Telegram
- ✅ Prevent duplicate processing

### 3. Data Integrity
- ✅ Use database transactions for balance updates
- ✅ Add idempotency checks
- ✅ Log all payment attempts

### 4. Rate Limiting
- ✅ Limit invoice creation requests
- ✅ Prevent abuse of payment endpoints

---

## 7. Offer Model Benefits

### Why Store Offers in Database?

**Current State**: Offers are hardcoded in the balance page UI component
**New State**: Offers stored in database with Offer model

**Benefits**:
1. **Dynamic Management**: Enable/disable offers without code deployment
2. **Price Updates**: Change prices in real-time without redeploying
3. **Analytics**: Track which offers are purchased most (via PaymentTransaction.offer_id)
4. **Flexibility**: Add new offers or modify existing ones via database/admin
5. **Consistency**: Single source of truth for offer data
6. **Type Safety**: Database ensures offer data integrity
7. **Multi-Environment**: Different offers for dev/staging/production

### Offer Management Workflow

**Initial Setup**:
1. Run migration to create Offer model
2. Seed database with initial offers (matching current UI)
3. Update frontend to fetch from API

**Ongoing Management**:
- Update prices: Change `price_in_stars` in database
- Disable offers: Set `is_active = false`
- Add new offers: Insert new Offer records
- Reorder offers: Update `display_order` values
- Feature offers: Set `is_featured = true` for special promotions

**Future Enhancement**: Admin panel/API to manage offers without direct database access

---

## 8. Questions & Clarifications Needed

### 1. Pricing Strategy
- **Question**: What is the Stars-to-USD conversion rate?
- **Question**: Should prices be set in Stars directly or converted from USD?
- **Recommendation**: Set prices directly in Stars for simplicity
- **Action**: Determine initial Stars prices for all 12 offers (4 COMBO, 4 ENERGY, 4 DIAMOND)

### 2. Offer Configuration ✅ RESOLVED
- **Decision**: Offers will be stored in database (Offer model)
- **Implementation**: Create seed script to populate initial offers
- **Future**: Can add admin panel for offer management later

### 3. Balance Management
- **Question**: How should diamonds and energy be consumed?
- **Question**: Should there be limits on balance (max diamonds/energy)?
- **Recommendation**: Document consumption logic separately
- **Note**: Balance tracking (diamonds/energy) will be added to Users model

### 4. Offer Seeding
- **Question**: What should be the initial Stars prices for each offer?
- **Question**: Should ENERGY and DIAMOND offers cost the same as COMBO, or half price?
- **Recommendation**: 
  - COMBO: Full price (e.g., Basic = 10,000 Stars)
  - ENERGY: Half price (e.g., Basic = 5,000 Stars for 100 energy)
  - DIAMOND: Half price (e.g., Basic = 5,000 Stars for 100 diamonds)

### 5. Webhook Configuration
- **Question**: Is webhook URL already configured?
- **Question**: Should webhook be set up automatically or manually?
- **Recommendation**: Create setup script for webhook configuration

### 6. Payment Provider
- **Question**: Are we using Stars only, or also supporting other payment methods?
- **Current Plan**: Stars only (simplest)
- **Future**: Can add other providers later

### 7. Testing Environment
- **Question**: Is there a Telegram test environment for Stars?
- **Recommendation**: Test with small amounts in production-like environment

---

## 8. Next Steps

1. **Review and Approve Plan** - Review this document and clarify questions
2. **Set Up Bot** - Create/get Telegram bot token
3. **Database Migration** - Add payment-related fields and Offer model
4. **Seed Initial Offers** - Populate database with offers from current UI
5. **Create Offers API** - Build `/api/offers` endpoint to fetch offers
6. **Update Frontend** - Replace hardcoded offers with API fetch
7. **Backend Implementation** - Start with invoice creation endpoint (using Offer model)
8. **Frontend Integration** - Connect balance page to payment flow
9. **Webhook Setup** - Configure and test webhook handler
10. **Testing** - Comprehensive testing of payment flow
11. **Deployment** - Deploy to production with monitoring

---

## 9. Resources Reference

- [Telegram Bot API - Payments](https://core.telegram.org/bots/api#payments)
- [Telegram WebApp SDK](https://core.telegram.org/bots/webapps)
- [Blog: Telegram Stars Payment Integration](https://blog.octalabs.com/telegram-stars-payment-integration-in-mini-app-2f1d4d8098be)
- [Medium: Telegram Payments via Stars](https://cakeinpanic.medium.com/telegram-payments-via-stars-5972850bbc42)
- [Video Tutorial](https://www.youtube.com/watch?v=XOLOW8qUSdw)

---

## 10. Estimated Timeline

- **Phase 1-2** (Database & Config): 2-4 hours
- **Phase 3** (Backend): 4-6 hours
- **Phase 4** (Frontend): 3-4 hours
- **Phase 5** (Webhook): 2-3 hours
- **Phase 6-7** (Testing & Polish): 3-4 hours

**Total Estimated Time**: 14-21 hours

---

**Document Version**: 1.0  
**Created**: 2025-01-27  
**Status**: Ready for Review

