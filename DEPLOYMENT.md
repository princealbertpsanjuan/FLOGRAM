# Deploying FLOGRAM

| Part | Where it runs | Cost |
| --- | --- | --- |
| Database | MongoDB Atlas (M0) | Free |
| API (`server/`) | Render web service | Free |
| Uploaded photos | Cloudinary | Free |
| Admin web portal (`apps/mobile`, web export) | Render static site | Free |
| AI image search (`ai-service/`) | Hugging Face Space (Docker) | Free |
| Mobile app | Android APK built with EAS | Free |

Do the steps in order. Keep a notepad open because some steps provide values
that are needed in later steps.

---

## 1. Database: MongoDB Atlas

### Is your database already on Atlas?

Open `server/.env` and look at `MONGODB_URI`:

- Starts with `mongodb+srv://` and contains `mongodb.net` → **already Atlas**.
  Go to step 1c (network access) and reuse this value.
- Starts with `mongodb://localhost` or `mongodb://127.0.0.1` → **local only**.
  Render cannot reach your PC, so do steps 1a and 1b.

### 1a. Create a free cluster

1. Sign up at MongoDB Atlas.
2. Create an **M0 Free** cluster.
3. Go to **Database Access** and create a database user with read/write access.
4. Go to **Connect → Drivers** and copy the connection string.
5. Add the database name `flogram` before the `?`.

Example:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/flogram?retryWrites=true&w=majority
```

Keep the real username and password private.

### 1b. Copy local data to Atlas

If existing local accounts, products, orders, and other data need to be
preserved, install MongoDB Database Tools and use `mongodump` and
`mongorestore`.

Example:

```powershell
mongodump --uri "mongodb://127.0.0.1:27017/flogram" --out flogram-dump
mongorestore --uri "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net" flogram-dump
```

If starting with an empty database, this step can be skipped.

### 1c. Allow Render to connect

In MongoDB Atlas:

**Network Access → Add IP Address → Allow access from anywhere**

Add:

```text
0.0.0.0/0
```

This allows the deployed Render service to connect to Atlas.

---

## 2. Photos: Cloudinary

1. Create or sign in to a Cloudinary account.
2. Open the Cloudinary dashboard and locate the API credentials.
3. Create the `CLOUDINARY_URL` in this format:

```text
cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Keep the real API secret private.

Add `CLOUDINARY_URL` to the local `server/.env` and to the Render environment
variables.

### Upload existing local images

From the project:

```powershell
cd server
npm run upload-to-cloud
```

This uploads existing local FLOGRAM images to Cloudinary.

For the current FLOGRAM deployment, all existing images were successfully
mirrored to Cloudinary.

---

## 3. AI Image Search: Hugging Face Space

FLOGRAM's computer-vision service runs separately from the main API.

1. Create a Hugging Face Space.
2. Use:
   - SDK: **Docker**
   - Template: **Blank**
   - Hardware: **CPU Basic**
   - Visibility: **Public**
3. Upload the required contents of `ai-service/`, including:
   - `Dockerfile`
   - `README.md`
   - `requirements.txt`
   - `app/`
4. Wait for the Space to finish building.
5. Test:

```text
https://<username>-flogram-ai.hf.space/health
```

The endpoint should return a healthy response.

Use the base URL without `/health` as:

```text
AI_SERVICE_URL
```

The deployed FLOGRAM AI service uses the CLIP model for image comparison/search.

---

## 4. API and Admin Portal: Render

FLOGRAM uses `render.yaml` to define the deployed services.

The Blueprint creates:

- `flogram-api`
- `flogram-admin`

### 4a. Deploy

1. Push the deployment-ready FLOGRAM code to GitHub.
2. Sign in to Render.
3. Create a **Blueprint**.
4. Select the FLOGRAM repository.
5. Allow Render to read `render.yaml`.

### 4b. API environment variables

Configure the required environment variables for `flogram-api`:

```text
MONGODB_URI
PUBLIC_BASE_URL
CLOUDINARY_URL
AI_SERVICE_URL
XAI_API_KEY
PAYMONGO_SECRET_KEY
PAYMONGO_WEBHOOK_SECRET
OPENROUTESERVICE_API_KEY
EMAIL_USER
EMAIL_PASSWORD
```

For the current deployment:

```text
PUBLIC_BASE_URL=https://flogram-api.onrender.com
```

Do not commit secret values to GitHub.

### 4c. Admin environment variable

For `flogram-admin`:

```text
EXPO_PUBLIC_API_URL=https://flogram-api.onrender.com/api/v1
```

This value is included when the Admin web application is built.

### 4d. Verify the API

Open:

```text
https://flogram-api.onrender.com/api/v1/health
```

The endpoint should return a successful production health response.

The API root can also be checked at:

```text
https://flogram-api.onrender.com
```

### 4e. Verify the Admin portal

Open the deployed `flogram-admin` Render URL and log in using an Admin account.

Confirm that the Admin portal communicates with the deployed Render API rather
than a localhost address.

> Render free services may spin down after inactivity. The first request after
> the service has been idle can take longer than normal.
>
> Before the capstone defense, open the API health endpoint, Admin portal, and
> other deployed services several minutes before presenting.

---

## 5. PayMongo

FLOGRAM currently uses PayMongo **Test Mode** for payment testing.

### 5a. PayMongo environment variables

The Render API requires:

```text
PAYMONGO_SECRET_KEY
PAYMONGO_WEBHOOK_SECRET
```

Keep both values private.

### 5b. Webhook

In the PayMongo Test Mode dashboard, configure the webhook endpoint as:

```text
https://flogram-api.onrender.com/api/v1/checkout/webhook/paymongo
```

Subscribe to:

```text
checkout_session.payment.paid
```

The webhook must be **Enabled**.

The webhook secret key must correspond to the value configured as:

```text
PAYMONGO_WEBHOOK_SECRET
```

on the Render `flogram-api` service.

### 5c. Test webhook delivery

Use PayMongo's **Test Events** feature and send:

```text
checkout_session.payment.paid
```

Then check **Event Deliveries**.

A successful delivery should show:

```text
Success
```

with no failed retries.

### 5d. Payment result pages

FLOGRAM provides deployed result pages for PayMongo checkout redirects.

Successful payment:

```text
https://flogram-api.onrender.com/payment/success
```

Cancelled payment:

```text
https://flogram-api.onrender.com/payment/cancelled
```

The success page tells the customer that payment was received and that the
order status updates automatically.

The cancelled page tells the customer that no payment was made and that they
can return to the FLOGRAM app and try again.

Both pages should be tested directly after deployment.

### 5e. Full payment test

The final payment test should be performed through the FLOGRAM Customer app:

1. Log in as Customer.
2. Add a product and create an order.
3. Select an online payment method.
4. Complete the transaction using PayMongo Test Mode.
5. Confirm the success page appears.
6. Confirm the PayMongo webhook is delivered successfully.
7. Confirm the order is marked as paid in FLOGRAM.

No real money should be used while PayMongo is in Test Mode.

---

## 6. Admin Account

If existing data was migrated to MongoDB Atlas, the existing Admin account can
be used.

If a new Admin account needs to be created, configure the required values in
the local `server/.env`:

```text
MONGODB_URI
ADMIN_EMAIL
ADMIN_PASSWORD
```

Then run:

```powershell
cd server
npm run create-admin
```

Do not commit Admin credentials or `.env` files to GitHub.

---

## 7. Delivery Routing

FLOGRAM uses **OpenRouteService** for its routing functionality.

The routing API key is configured on the backend as:

```text
OPENROUTESERVICE_API_KEY
```

The key is stored in the Render `flogram-api` environment variables.

It should remain server-side and should not be placed inside the Android APK.

The current FLOGRAM deployment does not require the old
`GOOGLE_MAPS_API_KEY` EAS setup described in earlier deployment instructions.

---

## 8. Android APK: Expo Application Services (EAS)

The FLOGRAM mobile application is built using Expo Application Services.

### 8a. Install EAS CLI

From the mobile application directory:

```powershell
cd apps/mobile
npm install -g eas-cli
```

Log in:

```powershell
eas login
```

Check the logged-in account if necessary:

```powershell
eas whoami
```

### 8b. Initialize the EAS project

Run:

```powershell
eas init
```

The current FLOGRAM EAS project is linked to the `flogram` Expo account.

The EAS project configuration is stored in the Expo app configuration.

### 8c. Configure `eas.json`

The preview build should generate an installable Android APK.

Example:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://flogram-api.onrender.com/api/v1"
      }
    },
    "production": {
      "environment": "production",
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://flogram-api.onrender.com/api/v1"
      }
    }
  }
}
```

The important production API URL is:

```text
https://flogram-api.onrender.com/api/v1
```

Do not use a local IP address such as `192.168.x.x` in the deployed APK.

### 8d. Build the Android APK

Run:

```powershell
eas build -p android --profile preview
```

EAS builds the application in the cloud.

When the build finishes, it provides an Expo build page and an Android `.apk`
artifact.

The preview configuration uses:

```text
distribution: internal
buildType: apk
```

which allows the APK to be installed directly on an Android device.

### 8e. Retrieve an existing build

A completed EAS build does not disappear when the development computer is
restarted.

To see the latest Android build:

```powershell
eas build:list --platform android --limit 1
```

To inspect a specific build:

```powershell
eas build:view <BUILD_ID>
```

The Expo build page provides access to the APK installation/download option.

### 8f. Install and test

On an Android device:

1. Open the Expo build/install page.
2. Download the APK.
3. Allow installation from the browser if Android asks for permission.
4. Install FLOGRAM.
5. Open the application.
6. Verify that it connects to the deployed Render API.

Test all mobile roles:

- Customer
- Seller
- Rider

The current APK is an Android build. An Android `.apk` cannot be installed on
an iPhone.

---

## 9. Security Notes

Never commit the following real values to GitHub:

```text
MONGODB_URI
CLOUDINARY_URL
XAI_API_KEY
PAYMONGO_SECRET_KEY
PAYMONGO_WEBHOOK_SECRET
OPENROUTESERVICE_API_KEY
EMAIL_PASSWORD
```

Keep real credentials in:

- Local `.env` files that are ignored by Git
- Render environment variables
- Other secure deployment environment-variable systems

Use `.env.example` only for variable names and placeholder values.

The OpenRouteService key remains on the backend and is not embedded in the
Android APK.

---

## 10. Deployment Verification

Before considering the deployment complete, verify:

- [x] MongoDB Atlas is accessible from Render.
- [x] `flogram-api` is deployed on Render.
- [x] `/api/v1/health` returns a successful production response.
- [x] `flogram-admin` is deployed on Render.
- [x] Admin can log in through the deployed Admin portal.
- [x] Existing product/upload images were mirrored to Cloudinary.
- [x] Hugging Face AI service is deployed.
- [x] Hugging Face `/health` reports the AI service as healthy.
- [x] PayMongo Test Mode webhook points to the Render API.
- [x] `checkout_session.payment.paid` test webhook delivery succeeds.
- [x] `/payment/success` loads correctly.
- [x] `/payment/cancelled` loads correctly.
- [x] EAS project is configured.
- [x] Android preview APK builds successfully.
- [ ] Install the APK on a physical Android phone.
- [ ] Log in as Customer on the deployed APK.
- [ ] Log in as Seller on the deployed APK.
- [ ] Log in as Rider on the deployed APK.
- [ ] Confirm product photos display correctly in the APK.
- [ ] Confirm AI image search works from the APK.
- [ ] Complete a PayMongo Test Mode payment through the Customer app.
- [ ] Confirm the paid order automatically updates after the PayMongo webhook.
- [ ] Verify delivery/routing functionality from the deployed mobile app.

---

## 11. Before the Capstone Defense

Several minutes before presenting:

1. Open the Render API health endpoint.
2. Open the Render Admin portal and log in.
3. Open the Hugging Face AI `/health` endpoint.
4. Open FLOGRAM on the Android device.
5. Confirm Customer, Seller, Rider, and Admin accounts are ready.
6. Confirm product images load.
7. Confirm the AI service responds.
8. Confirm routing works.
9. Keep PayMongo in Test Mode for the demonstration unless live payments have
   intentionally been configured.
10. Perform one final end-to-end test before the presentation.

### Important

The deployment is not considered fully end-to-end tested until the generated
APK has been installed on a physical Android device and the Customer, Seller,
Rider, payment, AI image search, and routing flows have been verified against
the deployed services.