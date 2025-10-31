# Triboar Guild - System Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER & FRONTEND                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [1] User clicks "Join"                                                      │
│      ↓                                                                        │
│  [2] Redirected to Discord OAuth                                             │
│      ↓                                                                        │
│  [3] Discord authorizes                                                      │
│      ↓                                                                        │
│  [4] Backend creates JWT token                                               │
│      ↓                                                                        │
│  [5] User clicks checkout button (with token)                                │
│      ↓                                                                        │
│  [6] Redirected to Stripe Checkout                                           │
│      ↓                                                                        │
│  [7] User enters card + clicks "Subscribe"                                   │
│      ↓                                                                        │
│  [8] Payment processed by Stripe                                             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js/Express)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ API Routes                                                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • GET /health                          (Health check)               │   │
│  │ • GET /api/auth/discord                (Discord OAuth URL)          │   │
│  │ • GET /api/auth/discord/callback       (OAuth callback)             │   │
│  │ • POST /api/checkout/session           (Create checkout)            │   │
│  │ • POST /api/checkout/portal            (Customer portal)            │   │
│  │ • POST /webhooks/stripe                (Stripe webhooks)            │   │
│  │ • POST /api/admin/roles/grant          (Manual role grant)          │   │
│  │ • POST /api/admin/roles/remove         (Manual role remove)         │   │
│  │ • POST /api/admin/reconcile            (Force role sync)            │   │
│  │ • GET /api/admin/users/search          (Search users)               │   │
│  │ • GET /api/admin/users/:id             (Get user details)           │   │
│  │ • GET /api/admin/audit-logs            (View audit trail)           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Services (Business Logic)                                            │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • discordAuthService        (OAuth with Discord)                    │   │
│  │ • discordRoleService        (Add/remove roles with retries)         │   │
│  │ • stripeService             (Stripe API wrapper)                     │   │
│  │ • subscriptionService       (Subscription lifecycle)                 │   │
│  │ • auditLogService           (Log all events)                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Middleware                                                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ • JWT verification         (Check token validity)                   │   │
│  │ • Admin check              (Check admin role)                       │   │
│  │ • Webhook auth             (Verify Stripe signature)                │   │
│  │ • Webhook idempotency      (Prevent duplicate processing)           │   │
│  │ • Error handler            (Global error handling)                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                ↙                           ↓                          ↘
        ┌─────────────┐          ┌──────────────────┐       ┌──────────────┐
        │  PostgreSQL │          │  Stripe API      │       │ Discord API  │
        │  Database   │          │                  │       │              │
        └─────────────┘          └──────────────────┘       └──────────────┘
            │                            │                           │
            ├─ users                     ├─ Webhooks                 ├─ Add role
            ├─ subscriptions             ├─ Checkout                 ├─ Remove role
            ├─ audit_logs               ├─ Customers                ├─ Get member
            ├─ discord_role_changes      └─ Subscriptions            └─ Get roles
            ├─ admin_overrides
            └─ processed_webhooks (idempotency)
```

---

## Data Flow - New Subscription

```
STEP 1: Authentication
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ User clicks "Join"
       ↓
┌──────────────────────────────────────────┐
│  Backend: GET /api/auth/discord          │
│  • Generate Discord OAuth URL            │
│  • Return authUrl                        │
└──────────────┬───────────────────────────┘
               │
               ↓
        ┌─────────────────┐
        │  Discord OAuth  │
        └────────┬────────┘
                 │ User authorizes
                 ↓
┌──────────────────────────────────────────────────┐
│  Backend: GET /api/auth/discord/callback         │
│  1. Verify OAuth code with Discord               │
│  2. Get Discord user (id, email, username)       │
│  3. Create/update user in DB                     │
│  4. Generate JWT token                           │
│  5. Return user info + token                     │
└──────────────┬───────────────────────────────────┘
               │
               ↓
        [User has JWT token]


STEP 2: Checkout
┌────────────────────────────────────────────────┐
│  Frontend: POST /api/checkout/session           │
│  Headers: Authorization: Bearer <JWT>           │
│  Body: { coupon_code?: "SUMMER20" }             │
└────────────┬─────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────┐
│  Backend: Create Checkout Session                    │
│  1. Get user from JWT token                         │
│  2. Find or create Stripe customer                  │
│  3. Create checkout session                         │
│     • mode: "subscription"                          │
│     • price_id: STRIPE_PRICE_ID                     │
│     • coupon: "SUMMER20" (if provided)              │
│  4. Return checkout URL                             │
└────────────┬─────────────────────────────────────────┘
             │
             ↓
      [Redirect to Stripe]


STEP 3: Payment
┌─────────────────────────┐
│  Stripe Checkout Page   │
│  User enters card info  │
│  Clicks "Subscribe"     │
└────────────┬────────────┘
             │
             ↓ Payment processed
┌──────────────────────────────────────────────────┐
│  Stripe Creates:                                 │
│  • Customer                                      │
│  • Subscription                                  │
│  • Invoice                                       │
│  • Sends webhook event                           │
└────────────┬─────────────────────────────────────┘
             │
             ↓


STEP 4: Webhook Processing
┌──────────────────────────────────────────────────┐
│  Backend: POST /webhooks/stripe                  │
│  Body: Raw Stripe event                          │
│  Headers: stripe-signature: <HMAC>               │
│                                                  │
│  1. Verify webhook signature                     │
│  2. Check if already processed (idempotency)     │
│  3. Route event: checkout.session.completed      │
│                                                  │
│  4. Get/Create user (by Stripe customer)         │
│  5. Link user ↔ Stripe customer                  │
│  6. Create subscription row in DB                │
│  7. Update user tier → "paid"                    │
│  8. Call Discord API → Add @Paid Member         │
│  9. Create audit log entry                       │
│  10. Mark webhook as processed                   │
└──────────────┬───────────────────────────────────┘
               │
               ↓
        ┌─────────────────────┐
        │  Discord Bot API    │
        │  Add role to member │
        └──────────┬──────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │  Discord Guild       │
        │  User now has        │
        │  @Paid Member role   │
        └──────────────────────┘


FINAL STATE:
┌─────────────────────────────────────────────┐
│  Database (PostgreSQL)                       │
├─────────────────────────────────────────────┤
│  users                                       │
│  • email: user@example.com                   │
│  • discord_id: 123456789                     │
│  • stripe_customer_id: cus_XXX                │
│  • tier: "paid" ✓                            │
│                                              │
│  subscriptions                               │
│  • stripe_subscription_id: sub_XXX           │
│  • status: "active" ✓                        │
│  • current_period_end: 2024-11-30            │
│                                              │
│  audit_logs                                  │
│  • event_type: "checkout.session.completed"  │
│  • status: "success" ✓                       │
│  • payload: {sessionId, subscriptionId, ...} │
│                                              │
│  discord_role_changes                        │
│  • action: "added" ✓                         │
│  • role_id: <@Paid Member ID>                │
│  • status: "success" ✓                       │
└─────────────────────────────────────────────┘

✅ User is now subscribed and has Discord access!
```

---

## Webhook Event Routing

```
┌─────────────────────────────────────┐
│  Stripe Event Received              │
└──────────────┬──────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────────┐
│  checkout.session.completed                                      │
├──────────────────────────────────────────────────────────────────┤
│  → Link user ↔ Stripe customer                                   │
│  → Create subscription in DB                                     │
│  → Update user tier → "paid"                                     │
│  → Add @Paid Member role to Discord                              │
│  → Log event to audit_logs                                       │
└──────────────────────────────────────────────────────────────────┘
               │
               ├─────────────────────────────────────────────────────┐
               │                                                     │
               ↓                                                     ↓
┌──────────────────────────────┐      ┌──────────────────────────────────┐
│  customer.subscription.       │      │  customer.subscription.updated   │
│  created                      │      │                                  │
├──────────────────────────────┤      ├──────────────────────────────────┤
│  → Create subscription row    │      │  → Update subscription status    │
│  → If already active/trialing │      │  → Handle status change          │
│    add role                   │      │  → Keep role if cancel_at_end    │
└──────────────────────────────┘      └──────────────────────────────────┘
               │                                 │
               │                                 ├─────────────────────┐
               │                                 │                     │
               ↓                                 ↓                     ↓
        [Log event]            [Log event]  [Check status]
                                              |
                                    ┌─────────┴──────────┐
                                    │                    │
                                    ↓                    ↓
                          Active/Trialing         Past Due/Canceled
                                 │                       │
                                 ↓                       ↓
                           [Add role]            [Keep or remove]
                                 │                       │
                                 └───────────┬───────────┘
                                             ↓
                                        [Log event]
               │
               │
               ├──────────────────────────────────────┐
               │                                      │
               ↓                                      ↓
┌──────────────────────────────┐   ┌────────────────────────────┐
│  invoice.payment_succeeded   │   │ invoice.payment_failed     │
├──────────────────────────────┤   ├────────────────────────────┤
│  → Confirm subscription      │   │ → Log failure event        │
│  → Sync Discord roles        │   │ → Keep roles (dunning)     │
│  → Add @Paid Member if gone  │   │ → Don't remove immediately │
└──────────────────────────────┘   └────────────────────────────┘
               │                           │
               ↓                           ↓
        [Log event]              [Log event, optionally]
                                   [Send notification]

               │
               ├──────────────────────────────────────┐
               │                                      │
               ↓                                      ↓
┌──────────────────────────────────┐   ┌─────────────────────────┐
│  customer.subscription.deleted   │   │ trial_will_end          │
├──────────────────────────────────┤   ├─────────────────────────┤
│  → Update subscription status    │   │ → Log event             │
│  → Remove @Paid Member role      │   │ → Send reminder (opt)   │
│  → Remove @Guild Member role     │   │                         │
│  → Update user tier → "free"     │   │                         │
│  → Log event                     │   │                         │
└──────────────────────────────────┘   └─────────────────────────┘
               │                           │
               ↓                           ↓
           [REVOKED]               [NOTIFICATION SENT]
```

---

## Database Schema

```
┌─────────────────────────────────────────┐
│             users                       │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ email (string) UNIQUE                   │
│ discord_id (string) UNIQUE              │
│ discord_username (string)               │
│ discord_avatar (string)                 │
│ stripe_customer_id (string) UNIQUE      │
│ tier ('free' | 'paid')                  │
│ created_at (timestamp)                  │
│ updated_at (timestamp)                  │
└─────────────────────────────────────────┘
            ↓ 1:N ↓
┌─────────────────────────────────────────┐
│        subscriptions                    │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ user_id (UUID) FK                       │
│ stripe_subscription_id (string) UNIQUE  │
│ stripe_price_id (string)                │
│ status (enum)                           │
│ current_period_start (timestamp)        │
│ current_period_end (timestamp)          │
│ trial_start/end (timestamp)             │
│ cancel_at, cancel_at_period_end         │
│ canceled_at (timestamp)                 │
│ metadata (jsonb)                        │
│ created_at (timestamp)                  │
│ updated_at (timestamp)                  │
└─────────────────────────────────────────┘
            ↓ 1:N ↓
┌─────────────────────────────────────────┐
│        audit_logs                       │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ user_id (UUID) FK (nullable)            │
│ event_type (string)                     │
│ action, resource_type, resource_id      │
│ stripe_event_id (string)                │
│ payload (jsonb)                         │
│ error_message (text)                    │
│ status ('success'|'failure'|'pending')  │
│ created_at (timestamp)                  │
└─────────────────────────────────────────┘
            ↓ 1:N ↓
┌─────────────────────────────────────────┐
│    discord_role_changes                 │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ user_id (UUID) FK                       │
│ discord_id (string)                     │
│ action ('added'|'removed')              │
│ role_id (string)                        │
│ role_name (string)                      │
│ reason (string)                         │
│ retry_count (int)                       │
│ error_message (text)                    │
│ status ('pending'|'success'|'failed')   │
│ created_at, completed_at (timestamp)    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    processed_webhooks                   │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ stripe_event_id (string) UNIQUE         │
│ event_type (string)                     │
│ processed_at (timestamp)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      admin_overrides                    │
├─────────────────────────────────────────┤
│ id (UUID) PK                            │
│ user_id (UUID) FK                       │
│ admin_discord_id (string)               │
│ override_type (enum)                    │
│ duration_days (int)                     │
│ reason (text)                           │
│ applied_at, expires_at (timestamp)      │
│ metadata (jsonb)                        │
└─────────────────────────────────────────┘
```

---

## Error Handling & Recovery

```
API Request
    ↓
    ├─ Input Validation
    │  ├─ Missing fields → 400 Bad Request
    │  └─ Invalid format → 400 Validation Error
    │
    ├─ Authentication
    │  ├─ Missing token → 401 Unauthorized
    │  ├─ Invalid token → 401 Unauthorized
    │  └─ Expired token → 401 Unauthorized
    │
    ├─ Authorization
    │  ├─ Not admin → 403 Forbidden
    │  └─ Insufficient permissions → 403 Forbidden
    │
    ├─ Resource Check
    │  └─ Not found → 404 Not Found
    │
    ├─ Business Logic
    │  ├─ Stripe API error → Retry with backoff
    │  ├─ Discord API error → 429? Retry | 401/403? Log & notify
    │  └─ Database error → 503 Service Unavailable
    │
    └─ Server Error → 500 Internal Error + Logging

Discord Role Operations
    ↓
    ├─ Attempt 1 (immediate)
    │  ├─ Success → Complete
    │  ├─ 429 (rate limit) → Wait Retry-After, retry
    │  ├─ 5xx error → Wait 1s, retry
    │  └─ 4xx error (401/403) → Log & notify admin
    │
    ├─ Attempt 2 (after 1s)
    │  ├─ Success → Complete
    │  ├─ 429 → Wait, retry
    │  ├─ 5xx → Wait 2s, retry
    │  └─ 4xx → Log & notify
    │
    ├─ Attempt 3 (after 2s)
    │  ├─ Success → Complete
    │  ├─ 429 → Wait, give up
    │  ├─ 5xx → Give up
    │  └─ 4xx → Log & notify
    │
    └─ All failed → Log to discord_role_changes table
                   Admin notified
                   Can reconcile manually
```

---

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     PRODUCTION                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │   DNS/Domain     │          │   SSL/HTTPS      │        │
│  │ triboar.com      │◄────────►│  Certificate     │        │
│  └────────┬─────────┘          └──────────────────┘        │
│           │                                                 │
│           ↓                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Load Balancer / Reverse Proxy                │   │
│  │    (Optional - Heroku/Railway/AWS handle this)      │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│    ┌──────────────┼──────────────┐                          │
│    │              │              │                          │
│    ↓              ↓              ↓                          │
│  ┌────────┐   ┌────────┐   ┌────────┐  (Multiple instances) │
│  │ Node   │   │ Node   │   │ Node   │                       │
│  │Server 1│   │Server 2│   │Server 3│                       │
│  └────┬───┘   └────┬───┘   └────┬───┘                       │
│       │            │            │                          │
│       └────────────┼────────────┘                          │
│                    │                                        │
│                    ↓                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │      PostgreSQL Database (RDS / Heroku / etc)      │    │
│  │                                                    │    │
│  │  • Automated backups (daily)                       │    │
│  │  • Replication (primary + standby)                 │    │
│  │  • Connection pooling                             │    │
│  │  • Monitoring & alerts                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  External APIs                                       │   │
│  │  ├─ Stripe (webhooks + REST API)                   │   │
│  │  ├─ Discord (OAuth + Bot API)                      │   │
│  │  └─ Monitoring (Datadog / LogRocket / etc)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Components & Responsibilities

| Component | Responsibility |
|-----------|-----------------|
| **Discord OAuth** | User authentication, identity verification |
| **JWT Tokens** | Session management, authorization |
| **Stripe API** | Payment processing, subscription management |
| **Webhooks** | Event handling, real-time updates |
| **Discord Role Service** | Role assignment, retry logic, reconciliation |
| **Audit Logs** | Event tracking, compliance, debugging |
| **Database** | Persistent state, user/subscription data |
| **Error Handler** | Consistent error responses, logging |
| **Admin Tools** | Manual operations, visibility, troubleshooting |

---

## Scaling Considerations (Future)

**Current**: Single-instance Node.js with PostgreSQL

**Phase 2 Improvements**:
- Multiple Node instances with load balancer
- Redis for session caching
- Bull queue for async role operations
- Database read replicas for audit logs
- Monitoring & alerting
- Rate limiting on API

**Phase 3 Optimizations**:
- Caching layer (Redis)
- GraphQL API
- Real-time updates (WebSockets)
- Serverless webhook processor
- CDN for static assets

---

This architecture is:
- ✅ **Scalable** - Horizontal scaling possible
- ✅ **Reliable** - Error handling, retries, idempotency
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Secure** - JWT, webhook verification, input validation
- ✅ **Observable** - Audit logs, structured logging
- ✅ **Tested** - All flows documented with test cases
