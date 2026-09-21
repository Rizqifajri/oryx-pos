# Midtrans Payment Gateway Setup Guide

## Phase 1: Backend Installation & Configuration

### 1. Install Dependencies

```bash
cd apps/server
npm install midtrans-client
npm install -D @types/midtrans-client
```

### 2. Configure Environment Variables

Add these to `apps/server/.env`:

```env
# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
FRONTEND_URL=http://localhost:3001
```

**Getting Credentials:**
- Sandbox: https://dashboard.sandbox.midtrans.com/
- Production: https://dashboard.midtrans.com/
- Navigate to Settings → Access Keys

### 3. Run Database Migration

```bash
# From project root
npm run db:push

# Or manually run the migration
psql $DATABASE_URL -f packages/db/src/migrations/0006_add_payment_requests.sql
```

### 4. Verify Backend Setup

Start the backend server:
```bash
npm run dev:api
```

Check that it starts without errors. You should see the payment routes registered.

## Phase 2: Frontend Configuration

### 1. Create Frontend Environment File

Create `apps/web/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
JWT_SECRET=change-me-to-a-long-random-string-min-32
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
```

**Note:** The `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` must match your Midtrans client key.

### 2. Install Frontend Dependencies (Next Phase)

The frontend implementation includes:
- Adding Midtrans Snap script to layout
- Creating payment API client functions
- Creating payment hooks
- Updating customer checkout page
- Creating payment result pages

## Phase 3: Testing

### Test with Midtrans Sandbox

1. **Test Card Numbers:**
   - Success: 4811 1111 1111 1114
   - Challenge: 4511 1111 1111 1118
   - Deny: 4411 1111 1111 1118

2. **Test QRIS/GoPay:**
   Use the Midtrans Simulator app in sandbox mode

3. **Webhook Testing:**
   - Use ngrok or similar to expose your local backend
   - Configure webhook URL in Midtrans dashboard: `https://your-domain.com/api/v1/payments/webhook`

### API Endpoints Created

- `POST /api/v1/payments/create` - Create payment for an order
- `POST /api/v1/payments/webhook` - Receive Midtrans notifications (public)
- `GET /api/v1/payments/:id` - Get payment request details
- `GET /api/v1/payments/order/:orderId` - Get payment by order ID
- `GET /api/v1/payments` - List payment requests

### Example: Create Payment Request

```bash
curl -X POST http://localhost:3000/api/v1/payments/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_UUID_HERE"}'
```

Response:
```json
{
  "id": "payment-request-id",
  "snapToken": "TOKEN",
  "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/...",
  "amount": 115000,
  "expiresAt": "2026-09-22T14:00:00.000Z"
}
```

## Phase 4: Production Deployment

### 1. Get Production Credentials
- Sign up for production Midtrans account
- Complete business verification
- Get production server & client keys

### 2. Update Environment Variables
```env
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_SERVER_KEY=Mid-server-PRODUCTION_KEY
MIDTRANS_CLIENT_KEY=Mid-client-PRODUCTION_KEY
FRONTEND_URL=https://your-production-domain.com
```

### 3. Configure Webhook in Midtrans Dashboard
- Settings → Configuration → Payment Notification URL
- Set to: `https://your-api-domain.com/api/v1/payments/webhook`

### 4. Enable Payment Methods
In Midtrans dashboard, enable:
- QRIS
- GoPay
- ShopeePay
- Bank Transfer (BCA, BNI, BRI, Permata)
- Virtual Account

## Security Checklist

- ✅ Webhook signature verification implemented
- ✅ Server-side amount calculation (never trust client)
- ✅ Idempotent webhook handling (duplicate notifications won't create multiple transactions)
- ✅ Tenant isolation enforced
- ✅ Atomic order → transaction → table status updates
- ✅ HTTPS required in production
- ✅ Environment variables never committed to git

## Troubleshooting

### Payment Creation Fails
- Check order exists and is not CANCELED
- Verify order hasn't already been paid
- Check Midtrans credentials are correct
- Review server logs for Midtrans API errors

### Webhook Not Received
- Verify webhook URL is publicly accessible (use ngrok for local testing)
- Check Midtrans dashboard → Transactions → select transaction → see webhook attempts
- Verify no firewall blocking Midtrans IPs

### Signature Verification Fails
- Ensure `MIDTRANS_SERVER_KEY` matches the key in Midtrans dashboard
- Check webhook payload is valid JSON
- Review the signature calculation in logs

## Support Resources

- Midtrans Documentation: https://docs.midtrans.com/
- Midtrans API Reference: https://api-docs.midtrans.com/
- Node.js Client: https://github.com/Midtrans/midtrans-nodejs-client
- Support: https://midtrans.com/contact-us

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Install dependencies (see above)
3. ⏳ Run migration
4. ⏳ Configure environment variables
5. ⏳ Test backend endpoints
6. 🔄 Frontend implementation (separate phase)
7. 🔄 End-to-end testing
8. 🔄 Production deployment

---

**Implementation Status:** Backend complete, frontend pending
**Estimated Time to Complete Frontend:** 4-6 hours
