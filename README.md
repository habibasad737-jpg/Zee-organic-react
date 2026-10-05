# Zee Organic Store (React + Vite)

`npm install` then `npm run dev` (build: `npm run build`).

- Brand and shipping: `src/config.js`. Colours: top of `src/index.css`. Products: `src/data.js`. Logo: `public/images/logo.png`.
- Pack illustrations are drawn in `src/art.js`; replace with real photos when available.
- Sign-in and account creation use Firebase Authentication (`src/firebase.js`). Enable Email/Password and Phone authentication in the Firebase console and add the deployed site domain to Firebase Authentication's authorized domains. Phone sign-in also requires Firebase phone authentication and SMS verification to be enabled.
- The account dashboard supports Firebase profile-name updates and password-reset email. Contact and delivery details are stored in the signed-in user's `customerProfiles/{uid}` Firestore document and are available across devices; existing browser-only delivery details are migrated when that profile is first loaded. Configure Firestore rules so each signed-in user can read and write only their own profile, for example:

  ```text
  match /customerProfiles/{userId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```

  Add this match inside the existing `/databases/{database}/documents` rules block without replacing the rest of your rules. Wishlists remain stored in this browser per Firebase user and are not synced between devices. Orders, returns/cancellations and account-linked reviews need a real checkout/order and review backend; checkout and product ratings are currently demo data.
- Placeholders: checkout/payment, newsletter API and orders. Product review counts are demo data.
