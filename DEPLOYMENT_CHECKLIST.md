# Deployment Checklist

## Pre-Deployment (Local Testing)

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running locally
- [ ] Created local database `triboar_guild`
- [ ] Stripe account created (test mode)
- [ ] Discord server created + bot invited
- [ ] All `.env` variables filled in

### Code Testing
- [ ] `npm install` runs without errors
- [ ] `npm run migrate` creates all tables
- [ ] `npm run dev` starts server at port 3000
- [ ] `GET /health` returns `{"status":"ok"}`

### Feature Testing (Manual)
- [ ] Discord OAuth login works
- [ ] Stripe Checkout session created
- [ ] Test card payment accepted (4242 4242 4242 4242)
- [ ] User receives @Paid Member role in Discord
- [ ] Audit log created for subscription event
- [ ] User can access customer portal
- [ ] Admin can search users
- [ ] Admin can manually grant/remove roles

### Webhook Testing
- [ ] Stripe CLI forwarding works
- [ ] Webhook signature verification passes
- [ ] Idempotency prevents duplicate processing
- [ ] Failed webhook handled gracefully

---

## Production Deployment

### 1. Infrastructure Setup

#### Database (PostgreSQL)
- [ ] Create production database (e.g., AWS RDS, Heroku Postgres, DigitalOcean)
- [ ] Set strong password
- [ ] Enable automated backups
- [ ] Set backup retention (30 days minimum)
- [ ] Test connection locally
- [ ] Document connection string securely

#### Hosting
- [ ] Choose platform (Heroku, Railway, AWS, DigitalOcean, etc.)
- [ ] Create project/app
- [ ] Configure auto-deploy from Git (if supported)
- [ ] Set up monitoring/alerts

#### Domain & SSL
- [ ] Register or point domain
- [ ] Configure SSL certificate (automatic with most platforms)
- [ ] Test HTTPS connection

### 2. Environment Configuration

#### Secrets & Keys
- [ ] Generate new `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Get **production Stripe API keys** (not test keys!)
  - [ ] Secret Key (sk_live_...)
  - [ ] Webhook signing secret (whsec_... for production)
- [ ] Set **production Discord OAuth redirect URI** (https://yourdomain.com/api/auth/discord/callback)
- [ ] Get production **Discord bot token**
- [ ] Get production **Discord role IDs** and **guild ID**

#### Environment Variables
Set in hosting platform's config:

```env
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database
DATABASE_URL=<production-db-connection-string>

# Stripe (PRODUCTION)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
STRIPE_SUCCESS_URL=https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://yourdomain.com/cancel
STRIPE_PORTAL_RETURN_URL=https://yourdomain.com/account

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_PAID_ROLE_ID=role_id
DISCORD_GUILD_MEMBER_ROLE_ID=role_id
DISCORD_PLAYER_ROLE_ID=role_id

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/discord/callback

# JWT
JWT_SECRET=<randomly-generated-secret>
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Admin
ADMIN_DISCORD_IDS=your_id,other_admin_ids
```

### 3. Stripe Configuration

#### Webhook Endpoint
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://yourdomain.com/webhooks/stripe`
- [ ] Events to subscribe:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.trial_will_end`
- [ ] Click "Add endpoint"
- [ ] Copy signing secret to `STRIPE_WEBHOOK_SECRET` in env

#### Product & Price
- [ ] Verify product "Triboar Guildhall Membership" exists
- [ ] Verify monthly price is configured
- [ ] Copy Price ID to `STRIPE_PRICE_ID` in env

#### Testing
- [ ] Send test webhook from Stripe Dashboard
- [ ] Verify server receives and processes correctly

### 4. Discord Configuration

#### Bot Permissions
- [ ] Verify bot is in server
- [ ] Verify bot has "Manage Roles" permission
- [ ] Verify bot's role is **higher** than target roles in role hierarchy

#### OAuth Application
- [ ] Go to Discord Developer Portal
- [ ] Verify OAuth2 redirect URI is set to `https://yourdomain.com/api/auth/discord/callback`
- [ ] Verify scopes include `identify email`

### 5. Database Migration

- [ ] Connect to production database
- [ ] Run migrations: `npm run migrate` (or via deployment tool)
- [ ] Verify all tables created:
  ```sql
  SELECT * FROM information_schema.tables WHERE table_schema='public';
  ```

### 6. Deployment

#### Manual Deployment
```bash
# Pull latest code
git pull

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start server
npm start
```

#### Automated Deployment (Recommended)
- [ ] Connect Git repository to hosting platform
- [ ] Configure build command: `npm install`
- [ ] Configure start command: `npm start`
- [ ] Enable auto-deploy on push to `main` branch

### 7. Post-Deployment Testing

#### Health Checks
- [ ] `curl https://yourdomain.com/health` returns `{"status":"ok"}`
- [ ] Server logs show no errors

#### Feature Testing (Production)
- [ ] Discord OAuth works
- [ ] Stripe Checkout creates session
- [ ] Test payment with test card
- [ ] Webhook fires and is processed
- [ ] Discord role is assigned
- [ ] Audit log shows event

#### Database Verification
- [ ] Connect to production DB
- [ ] Verify user created in `users` table
- [ ] Verify subscription in `subscriptions` table
- [ ] Verify audit log created
- [ ] Verify webhook marked as processed

### 8. Monitoring & Alerts

#### Logging
- [ ] Configure centralized logging (e.g., Papertrail, Datadog, CloudWatch)
- [ ] Set up log aggregation
- [ ] Create alerts for error logs

#### Metrics
- [ ] Monitor response times
- [ ] Track failed webhook deliveries
- [ ] Monitor Discord API errors
- [ ] Watch database connection pool

#### Uptime
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure alerts if service goes down
- [ ] Set up status page (optional)

### 9. Backups & Disaster Recovery

#### Database Backups
- [ ] Verify automated backups are enabled
- [ ] Test restore procedure
- [ ] Document recovery steps
- [ ] Set retention policy (30+ days)

#### Code Repository
- [ ] Code is in Git repository
- [ ] Repository is accessible
- [ ] Document deployment procedure

### 10. Security Hardening

#### HTTPS
- [ ] SSL certificate installed and auto-renewing
- [ ] All traffic redirects to HTTPS
- [ ] HSTS header set

#### Secrets
- [ ] No secrets in code repository
- [ ] Secrets stored in environment variables only
- [ ] Rotate JWT_SECRET regularly

#### API Security
- [ ] CORS properly configured for frontend domain
- [ ] Webhook signature verification working
- [ ] Admin routes protected
- [ ] Rate limiting considered (optional Phase 2)

#### Database
- [ ] Database not publicly accessible
- [ ] Strong password set
- [ ] Backups encrypted

---

## Post-Deployment Runbook

### If Webhooks Stop Working
1. Check Stripe Dashboard → Webhooks → Recent deliveries
2. Verify endpoint URL is correct and accessible
3. Check signing secret matches `STRIPE_WEBHOOK_SECRET`
4. Review server logs for errors
5. Test manually: `stripe trigger checkout.session.completed`

### If Discord Roles Aren't Assigned
1. Verify bot is in Discord server
2. Verify bot token is correct
3. Verify bot has "Manage Roles" permission
4. Verify bot's role is higher than target roles
5. Check server logs for Discord API errors
6. Try manual role assignment via admin endpoint

### If Users Can't Log In
1. Verify Discord OAuth redirect URI matches production URL
2. Verify Discord client ID/secret are for production app
3. Check OAuth logs in Discord Developer Portal
4. Review server logs for auth errors

### If Payment Processing Fails
1. Verify Stripe API keys are live keys (not test)
2. Verify webhook is configured in production
3. Check Stripe Dashboard for webhook failures
4. Review server logs for Stripe API errors

### If Database is Down
1. Check database service status
2. Verify connection string in environment
3. Try connecting manually with psql
4. Check database backups available
5. If corrupted, restore from backup and run migrations again

### Performance Issues
1. Check database query logs for slow queries
2. Review server logs for warnings about slow operations
3. Check rate limiting (Discord 429 errors)
4. Monitor memory/CPU usage on server
5. Consider adding caching (Phase 2)

---

## Rollback Procedure

If deployment has critical issues:

1. **Stop the current deployment**
   ```bash
   # On most platforms: redeploy previous version
   git revert <bad-commit>
   git push
   ```

2. **Verify previous version works**
   - Test health endpoint
   - Manually test key features

3. **Check database consistency**
   - Run migrations to ensure schema is correct
   - Verify no orphaned data

4. **Restart services if needed**
   - Restart application server
   - Restart database connection pool

---

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check uptime status

### Weekly
- [ ] Review webhook deliveries in Stripe
- [ ] Check database backup completion
- [ ] Monitor API response times

### Monthly
- [ ] Review audit logs for suspicious activity
- [ ] Update dependencies (npm update)
- [ ] Rotate JWT_SECRET if needed
- [ ] Review Discord role configurations

### Quarterly
- [ ] Disaster recovery test (restore from backup)
- [ ] Penetration test considerations
- [ ] Update security policies
- [ ] Review error trends

---

## Documentation Updates

Keep these updated in production:

- [ ] Environment variables list (sanitized)
- [ ] Deployment procedure steps
- [ ] Emergency contacts
- [ ] Database backup location
- [ ] Monitoring dashboards links
- [ ] Status page URL
- [ ] Runbook procedures

---

## Success Criteria

You know deployment is successful when:

✅ `/health` endpoint returns 200
✅ User can complete Discord OAuth login
✅ User can create checkout session
✅ Test payment processes successfully
✅ Stripe webhook is received and processed
✅ Discord role is assigned to user
✅ Audit log shows all events
✅ Admin can search users and manage roles
✅ No errors in logs
✅ Database has correct data
✅ Monitoring/alerts are working

---

## Emergency Contacts

Document these for your team:

- Stripe support: https://stripe.com/help
- Discord support: https://support.discord.com
- Database host support: [Your DB provider]
- Hosting provider support: [Your host]
- Team lead contact: [Your contact]

---

## Sign-Off

- [ ] **Deployer**: Completed all steps above
- [ ] **QA**: Tested all features in production
- [ ] **Admin**: Verified monitoring is working
- [ ] **Team Lead**: Approved production deployment

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________
