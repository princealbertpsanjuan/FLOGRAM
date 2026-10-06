# FLOGRAM mobile app + Admin web portal

Expo (React Native, Expo Router, TypeScript). One codebase for:

- **Customer, Seller, Rider** – mobile app (Android / iOS)
- **Admin** – mobile app and the desktop web portal (`npx expo start --web`)

```bash
npm install
npx expo start          # phone (Expo Go / dev build)
npx expo start --web    # Admin web portal
```

`.env` must contain `EXPO_PUBLIC_API_URL=http://<server-ip>:<port>/api/v1`.

Folders: `app/` screens by role (`(customer)`, `(seller)`, `(rider)`, `(admin)`, `(shared)`, `(auth)`),
`components/` shared UI, `services/` API calls, `utils/` helpers, `web-shims/` web-only stand-ins.
