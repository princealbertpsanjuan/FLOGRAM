# Deploying FLOGRAM

| Part | Where it runs | Cost |
| --- | --- | --- |
| Database | MongoDB Atlas (M0) | Free |
| API (`server/`) | Render web service | Free |
| Uploaded photos | Cloudinary | Free |
| Admin web portal (`apps/mobile`, web export) | Render static site | Free |
| AI image search (`ai-service/`) | Hugging Face Space (Docker) | Free |
| Mobile app | Android APK built with EAS | Free |

Do the steps in order. Keep a notepad open: every step gives you a value
that a later step needs.

---

## 1. Database: MongoDB Atlas

### Is your database already on Atlas?

Open `server/.env` and look at `MONGODB_URI`:

- Starts with `mongodb+srv://` and contains `mongodb.net` → **already Atlas**.
  Go to step 1c (network access) and reuse this value.
- Starts with `mongodb://localhost` or `mongodb://127.0.0.1` → **local only**.
  Render cannot reach your PC, so do 1a and 1b.

### 1a. Create a free cluster

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Create cluster** → **M0 Free** → provider AWS, region **Singapore**.
3. **Database Access** → Add user (username + password, role *Read and write
   to any database*). Avoid `@ : / ?` in the password.
4. **Connect** → **Drivers** → copy the string and add the database name
   `flogram` before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/flogram?retryWrites=true&w=majority
   ```

### 1b. Copy your local data to Atlas (keeps your test accounts and listings)

Install **MongoDB Database Tools**
(<https://www.mongodb.com/try/download/database-tools>), then in PowerShell
(replace the database name if your local URI uses a different one):

```powershell
mongodump --uri "mongodb://127.0.0.1:27017/flogram" --out flogram-dump
mongorestore --uri "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net" flogram-dump
```

Prefer starting with an empty database? Skip this. You'll make an
admin account in step 6.

### 1c. Allow Render to connect

Atlas → **Network Access** → **Add IP Address** → **Allow access from
anywhere** (`0.0.0.0/0`). Render's free plan has no fixed IP.

---

## 2. Photos: Cloudinary

1. Sign up at <https://cloudinary.com> (free).
2. Dashboard → **API Keys**. Copy the **API environment variable**. It looks
   like `cloudinary://123456:abcDEF@your-cloud`.

How it works: the server still saves uploads to its disk, then copies each one
to Cloudinary. Render wipes its disk on every deploy. When a photo is missing
there, `/uploads/...` redirects to the Cloudinary copy. No database changes are
needed.

**Photos you already uploaded locally:** add
`CLOUDINARY_URL=cloudinary://...` to your local `server/.env`, then run:

```powershell
cd server
npm run upload-to-cloud
```

---

## 3. AI image search: Hugging Face Space

1. Sign up at <https://huggingface.co> → **New Space**.
2. Name `flogram-ai`, SDK **Docker** → **Blank**, hardware **CPU basic (free)**,
   Public.
3. **Files** → **Add file → Upload files**. Upload everything inside
   `ai-service/`: `Dockerfile`, `README.md`, `requirements.txt`, and the `app`
   folder. Commit.
4. Wait for **Running** (the first build takes about 10 minutes). Open
   `https://<your-username>-flogram-ai.hf.space/health`.
   It should show `"status"`.
5. Note this base URL (without `/health`). It is your `AI_SERVICE_URL`.

---

## 4. API and Admin portal: Render

1. Push your code to GitHub (with this deploy branch merged).
2. Sign up at <https://render.com> with GitHub.
3. **New** → **Blueprint** → choose the `FLOGRAM` repository. Render reads
   `render.yaml` and shows two services: **flogram-api** and **flogram-admin**.
4. Fill in the values it asks for:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | Atlas string from step 1 |
| `PUBLIC_BASE_URL` | `https://flogram-api.onrender.com` (fix it after deploy if Render gives a different URL) |
| `CLOUDINARY_URL` | from step 2 |
| `AI_SERVICE_URL` | from step 3 |
| `XAI_API_KEY` | your Grok key (same as local `.env`) |
| `PAYMONGO_SECRET_KEY` | `sk_test_...` (same as local) |
| `PAYMONGO_WEBHOOK_SECRET` | type `pending` for now (set in step 5) |
| `OPENROUTESERVICE_API_KEY` | same as local |
| `EMAIL_USER` / `EMAIL_PASSWORD` | same as local (Gmail app password) |
| `EXPO_PUBLIC_API_URL` (flogram-admin) | `https://flogram-api.onrender.com/api/v1` |

5. **Apply**. When both services are live:
   - Open `https://<api-url>/api/v1/health`. It should return success.
   - If the API URL differs from `flogram-api.onrender.com`, update
     `PUBLIC_BASE_URL` on flogram-api and `EXPO_PUBLIC_API_URL` on
     flogram-admin. Then on flogram-admin run **Manual Deploy → Clear build
     cache & deploy**, because the Admin portal bakes the URL in at build time.
   - Open the flogram-admin URL. This is the Admin web portal.

> Free Render services sleep after 15 minutes without traffic, and the first
> request after that takes about a minute. **On defense day, open the API
> health URL and the Admin portal about 5 minutes before you present.**
> Render's free plan may also block Gmail SMTP. If the password-reset email
> does not arrive, that is the cause. Everything else still works.

---

## 5. PayMongo webhook (marks online payments as paid)

1. PayMongo Dashboard (test mode) → **Developers → Webhooks → Add
   endpoint**.
   - URL: `https://<api-url>/api/v1/checkout/webhook/paymongo`
   - Event: `checkout_session.payment.paid`
2. Copy the webhook's **secret key** (`whsk_...`). On Render, set it as
   `PAYMONGO_WEBHOOK_SECRET` on flogram-api, then save. Render redeploys.

No Webhooks page in your dashboard? Create the webhook from PowerShell
instead:

```powershell
$key = "sk_test_YOUR_SECRET_KEY"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${key}:"))
$body = '{"data":{"attributes":{"url":"https://<api-url>/api/v1/checkout/webhook/paymongo","events":["checkout_session.payment.paid"]}}}'
Invoke-RestMethod -Method Post -Uri https://api.paymongo.com/v1/webhooks `
  -Headers @{ Authorization = "Basic $auth" } -ContentType "application/json" -Body $body
```

The response's `secret_key` is your `PAYMONGO_WEBHOOK_SECRET`.

After paying, PayMongo shows the customer a FLOGRAM "Payment received"
page (`/payment/success`). The customer then returns to the app.

---

## 6. Admin account

Skip this if you copied your local data in step 1b (your admin is
already there). Otherwise, put the Atlas `MONGODB_URI`, `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in your local `server/.env` and run:

```powershell
cd server
npm run create-admin
```

---

## 7. Android APK (EAS Build)

### 7a. Google Maps key (needed for delivery maps in the APK)

Expo Go has its own maps key, but your APK needs one:

1. <https://console.cloud.google.com> → create a project → enable
   **Maps SDK for Android** (Google asks for a billing account; the Maps
   SDK for mobile apps itself is free).
2. **Credentials** → **Create API key** → copy it.

Without this key the APK still works. Map areas show
"Map preview is unavailable" instead of crashing.

### 7b. Build

```powershell
cd apps/mobile
npm install -g eas-cli
eas login                      # create a free account at expo.dev if needed
eas init                       # creates the EAS project
eas env:create --name GOOGLE_MAPS_API_KEY --value "YOUR_KEY" --environment preview --visibility sensitive
```

If `eas init` says it cannot write to the dynamic config, open `app.json` and
add this inside `"expo"`:
`"extra": { "eas": { "projectId": "<the id it printed>" } }`.

Make sure `EXPO_PUBLIC_API_URL` in `eas.json` matches your Render API URL
(ending in `/api/v1`). Then run:

```powershell
eas build -p android --profile preview
```

The build runs on Expo's servers (about 15–25 minutes on the free plan).
When it finishes, you get a link and a QR code. Open it on the Android
phone, download the `.apk` and install it (allow *Install unknown apps*).

Changed the code later? Run the same `eas build` command again.

---

## Checklist before the defense

- [ ] `https://<api-url>/api/v1/health` returns success
- [ ] Admin portal loads and you can log in as Admin
- [ ] APK: log in as Customer / Seller / Rider
- [ ] Product photos show (Cloudinary)
- [ ] Image search returns results (HF Space is **Running**; open its
      `/health` first to wake it)
- [ ] A test GCash/card payment turns the order to *Paid*
- [ ] Wake everything up 5 minutes before presenting
