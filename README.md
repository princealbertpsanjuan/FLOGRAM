# FLOGRAM

AI-powered floral marketplace for Naga City: Customers, Sellers (florist shops), Riders and Admin.

```
apps/mobile   Expo (React Native) app — Customer, Seller, Rider, Admin
              + the Admin web portal (same code, `expo start --web`)
server        Node.js / Express 5 / MongoDB (Mongoose) REST API
ai-service    FastAPI + CLIP image embeddings (image search)
```

**Deploying (Render + Cloudinary + Atlas + Android APK): see [DEPLOYMENT.md](DEPLOYMENT.md).**

## Run

```bash
# API
cd server && npm install && npm run dev

# Mobile app (Expo Go / dev build)
cd apps/mobile && npm install && npx expo start

# Admin web portal (Admin accounts only)
cd apps/mobile && npx expo start --web
```

`apps/mobile/.env` needs `EXPO_PUBLIC_API_URL=http://<server-ip>:<port>/api/v1` (see `apps/mobile/.env.example`).
`server/.env` variables are listed in `server/.env.example`.

The web build is for Admin only. Customer, Seller and Rider accounts are told to use the mobile app;
their screens redirect to the login page on web.

## Main features

- Product catalog, cart, checkout (COD, Cash on Pickup, PayMongo), order tracking, reviews
- Gift add-ons (chocolates, teddy bears, balloons, greeting cards) managed by each Seller
- Follow florist shops; followers are notified when a shop adds a bouquet
- BloomBoard and the AI assistant: Customer mode (bouquet recommendations, Grok Imagine
  inspiration images), Seller mode and Rider mode (advice using live shop / delivery data)
- Customer behaviour analytics: FP-Growth frequent itemsets + association rules
  ("Customers also bought", Admin/Seller Insights)
- Review sentiment analysis: AFINN-165 lexicon with a Filipino/Taglish florist extension
- Rider work shifts, deliveries with proof photos, COD remittance, Rider payouts
- Seller earnings (sales − platform commission) and Admin Seller payouts
- Disputes (report a problem on an order, Admin resolves) and policy violations
  (warning / temporary suspension / ban; suspended accounts cannot log in)
- Seller/Rider requirement security checks: real file type (magic bytes), readable
  image size, same photo used twice, identical document from another account
  (SHA-256), DTI/TIN/ID/license formats and expiry dates, risk level (low/medium/high),
  per-document Accept/Resubmit review before approval, audit trail, and private
  verification files served only through signed links that expire in 15 minutes
- One status color system (`apps/mobile/constants/status-colors.ts`): red = permanent
  ban/rejected/failed, orange = temporary suspension, yellow = warning/pending,
  blue = in progress, green = active/approved, gray = lifted/closed (always with an
  icon and text, so it also works for color-blind users)
- BloomBoard shop tags and ratings: customers tag the shop that made a bouquet and
  rate it 1–5 stars (verified buyers only, one rating per shop); AFINN sentiment of
  the caption; community rating on the product page and the seller profile
- Price history: every bouquet / add-on price change is recorded (append-only), with
  a chart and timeline for customers, orders and revenue at each price for sellers,
  and Admin alerts for increases of 50% or more

## Checks

```bash
cd server && npm run verify:shifts   # rider shift slot-limit integration check
cd server && npm test                      # all checks below that need no database
cd server && npm run verify:requirements   # automated requirement checks
cd server && npm run verify:routing        # delivery fee, route cache, OpenRouteService fallback
cd server && npm run verify:checkout       # scheduled-delivery date rules (Philippine time)
cd server && npm run verify:analytics      # FP-Growth vs brute force, AFINN sentiment
cd server && npm run verify:security       # rate limiting, document review rules
```
