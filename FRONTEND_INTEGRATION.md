# Frontend Integration Guide

Your website now has full Discord OAuth + Stripe payment integration! Here's what was created:

## New Pages

All pages match your site's UI aesthetic (guild-brown, guild-blue, Tailwind CSS):

### 1. **OAuth Callback Page** (`/oauth-callback/`)
- User lands here after clicking "Join the Guildhall"
- Shows loading animation while Discord authenticates
- On success: Shows welcome message, stores JWT token, redirects to checkout
- On error: Shows error message with retry option
- **Auto-redirect**: After OAuth success, user automatically goes to checkout

### 2. **Checkout Page** (`/checkout/`)
- Shows user's Discord username & email
- Displays membership details ($5/month)
- Optional: Promo code input
- "Proceed to Payment" button
- Securely sends to Stripe Checkout via backend API
- **Security**: JWT token stored in localStorage, required for API call

### 3. **Success Page** (`/success/`)
- Shown after Stripe payment succeeds
- Displays "Welcome to Triboar Guildhall"
- Lists what happens next (Discord role assignment, access granted)
- Shows confirmation ID
- Links to Discord server and home page
- **What happens next**: Backend automatically assigns @Paid Member role

### 4. **Cancel/Failure Page** (`/cancel/`)
- Shown if user cancels payment or payment fails
- Explains what happened (no charges made)
- Common reasons for cancellation/decline
- "Try Again" button to retry payment
- Support/help information

## Updated Files

### `/layouts/index.html`
All 3 "Join the Guildhall" buttons now link to:
```
http://localhost:3000/api/auth/discord
```

This starts the Discord OAuth flow.

## How It Works (User Flow)

```
1. User clicks "Join the Guildhall" button
   ↓
2. Redirect to: http://localhost:3000/api/auth/discord
   ↓
3. Discord authorization page (user clicks "Authorize")
   ↓
4. Redirect to: /oauth-callback/ (your site)
   ↓
5. Page shows loading, calls backend with code
   ↓
6. Backend exchanges code for Discord user info
   ↓
7. Backend creates/updates user in database
   ↓
8. Backend creates JWT token
   ↓
9. Frontend stores token in localStorage
   ↓
10. Auto-redirect to /checkout/
   ↓
11. User sees membership details, can enter promo code
   ↓
12. User clicks "Proceed to Payment"
   ↓
13. Frontend calls backend to create Stripe Checkout session
   ↓
14. Redirect to Stripe Checkout (user enters card, etc.)
   ↓
15. Payment succeeds
   ↓
16. Stripe redirects to /success/
   ↓
17. Backend webhook fires automatically
   ↓
18. Backend assigns @Paid Member role in Discord
   ↓
19. User gets notification in Discord
```

## Configuration Needed

### Backend (.env file in `backend/` directory)

Set these values to your test accounts:

```env
# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_ID=price_...

# Discord OAuth App (from Discord Developer Portal)
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_PAID_ROLE_ID=role_id
```

See `backend/SETUP_GUIDE.md` for detailed setup instructions.

## Testing the Flow Locally

### 1. Start Backend
```bash
cd backend
npm install
npm run migrate
npm run dev
```

Backend runs at: `http://localhost:3000`

### 2. Start Frontend
```bash
# In root directory
hugo server
```

Frontend runs at: `http://localhost:1313`

### 3. Test the Flow

1. Go to `http://localhost:1313`
2. Click any "Join the Guildhall" button
3. Authorize with Discord
4. You should see OAuth callback page
5. Auto-redirect to checkout
6. Click "Proceed to Payment"
7. You'll go to Stripe Checkout
8. Use test card: `4242 4242 4242 4242`
9. Complete payment
10. You'll see success page
11. Check Discord - you should have @Paid Member role!

## Frontend Files

### Content Files (Hugo)
- `content/oauth-callback.md` - Markdown for OAuth page
- `content/checkout.md` - Markdown for checkout page
- `content/success.md` - Markdown for success page
- `content/cancel.md` - Markdown for cancel page

### Layout Files (HTML/JS)
- `layouts/oauth-callback.html` - OAuth callback page (with JavaScript)
- `layouts/checkout.html` - Checkout page (with JavaScript)
- `layouts/success.html` - Success page
- `layouts/cancel.html` - Failure/cancel page

All pages use:
- Your color scheme (guild-brown, guild-blue, guild-beige, etc.)
- Tailwind CSS for styling
- Responsive design (mobile-friendly)
- Inline JavaScript for interactivity

## Key JavaScript Features

### OAuth Callback Page (`oauth-callback.html`)
```javascript
// Gets authorization code from URL
// Calls backend to exchange for JWT token
// Stores token in localStorage
// Auto-redirects to checkout
```

### Checkout Page (`checkout.html`)
```javascript
// Checks for JWT token (must be logged in)
// Displays user info
// Handles promo code toggle
// Calls backend to create Stripe session
// Redirects to Stripe Checkout
```

## Backend API Endpoints Used

```
GET  /api/auth/discord
     → Returns Discord OAuth URL

GET  /api/auth/discord/callback?code=...
     → Exchanges code for user info
     → Returns JWT token

POST /api/checkout/session
     → Creates Stripe Checkout session
     → Requires: Authorization Bearer token
     → Returns: Stripe Checkout URL
```

See `backend/README.md` for full API documentation.

## What Happens Behind the Scenes

When user completes payment:

1. ✅ Stripe webhook hits your backend
2. ✅ Backend creates subscription record in database
3. ✅ Backend links Stripe customer to Discord user
4. ✅ Backend calls Discord API to add @Paid Member role
5. ✅ Backend logs all events in audit trail
6. ✅ User gets role notification in Discord

All automatic - user just sees their new role appear! 🎉

## Troubleshooting

### "Redirect to Discord isn't working"
- Check backend is running: `cd backend && npm run dev`
- Check CORS_ORIGIN in backend `.env` includes `http://localhost:1313`
- Check DISCORD_CLIENT_ID is set in `.env`

### "OAuth callback page shows error"
- Check `DISCORD_CLIENT_SECRET` in backend `.env`
- Make sure Discord OAuth app has redirect URI set to: `http://localhost:3000/api/auth/discord/callback`

### "Checkout page won't load after OAuth"
- Check browser console for errors
- Verify JWT token is being stored in localStorage
- Check backend is running and responding

### "Stripe payment page doesn't load"
- Verify `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in backend `.env`
- Make sure you're in Stripe test mode
- Check backend logs for Stripe API errors

### "Discord role not assigned after payment"
- Check Discord bot has "Manage Roles" permission
- Verify bot's role is HIGHER than @Paid Member role in role hierarchy
- Check backend logs for Discord API errors
- Try manual role assignment via admin endpoint

## Next Steps

1. ✅ Backend is built and ready
2. ✅ Frontend pages created and connected
3. ⏭️ Configure your test credentials (Stripe, Discord, etc.)
4. ⏭️ Test the full flow locally
5. ⏭️ Deploy both backend and frontend to production
6. ⏭️ Update to production API keys

## Production Notes

When deploying to production, change these URLs:

### Frontend Links
```html
<!-- Current (development) -->
<a href="http://localhost:3000/api/auth/discord">

<!-- Production -->
<a href="https://your-backend-domain.com/api/auth/discord">
```

Also change in checkout.html JavaScript calls:
- `http://localhost:3000/api/checkout/session` → `https://your-backend-domain.com/api/checkout/session`

### Backend URLs
In backend `.env`:
```env
# Development
STRIPE_SUCCESS_URL=http://localhost:1313/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:1313/cancel

# Production
STRIPE_SUCCESS_URL=https://your-site-domain.com/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://your-site-domain.com/cancel
```

See `backend/DEPLOYMENT_CHECKLIST.md` for full production setup.

## Architecture

```
Frontend (Hugo)                    Backend (Node.js)              External Services
┌─────────────────┐               ┌──────────────────┐            ┌──────────────┐
│  index.html     │               │                  │            │ Discord      │
│ (Join buttons)  │──────────────▶│ /api/auth/oauth  │───────────▶│ OAuth        │
└─────────────────┘               │                  │            └──────────────┘
        │                         │                  │
        │        GET code         │                  │            ┌──────────────┐
        └──────────────────────────▶ /callback       │            │ Discord      │
                                   │                  │────────────▶│ Bot API      │
         ┌─────────────────────────│ (verify + token) │            │ (Manage      │
         │                         │                  │            │  Roles)      │
         │                         └──────────────────┘            └──────────────┘
         │
    ┌────▼────────────┐            ┌──────────────────┐
    │ checkout.html   │            │                  │            ┌──────────────┐
    │ (show user info)│────────────▶│ /checkout/       │───────────▶│ Stripe       │
    │ (promo code)    │            │ session          │            │ Checkout     │
    └─────────────────┘            │                  │            └──────────────┘
         │                         │                  │
         │        POST session_id  │                  │
         └──────────────────────────▶ webhook         │
                                   │ processing       │            ┌──────────────┐
                                   │                  │            │ PostgreSQL   │
    ┌─────────────────────────────│ (role mgmt)      │───────────▶│ (audit logs) │
    │                             │                  │            └──────────────┘
    │ success.html                │                  │
    │ (confirmation)              └──────────────────┘
    └──────────────────────────────────────────────────┘
```

You're all set! 🚀
