# FLOGRAM

AI-powered floral marketplace for Butuan City: Customers, Sellers (florist shops), Riders and Admin.

```
apps/mobile   Expo (React Native) app — Customer, Seller, Rider, Admin
              + the Admin web portal (same code, `expo start --web`)
server        Node.js / Express 5 / MongoDB (Mongoose) REST API
```

## Run

```bash
# API
cd server && npm install && npm run dev

# Mobile app (Expo Go / dev build)
cd apps/mobile && npm install && npx expo start

# Admin web portal (Admin accounts only)
cd apps/mobile && npx expo start --web
```

`apps/mobile/.env` needs `EXPO_PUBLIC_API_URL=http://<server-ip>:<port>/api/v1`.

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

## Checks

```bash
cd server && npm run verify:shifts   # rider shift slot-limit integration check
```
