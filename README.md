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

  Add this match inside the existing `/databases/{database}/documents` rules block without replacing the rest of your rules. Orders are saved in the `orders` collection when checkout is completed. To allow customers to read only their own orders and the verified administrator to read all orders and update only fulfilment status/tracking, add this match to the same rules block:

  ```text
  match /orders/{orderId} {
    allow create: if request.auth != null
      && request.resource.data.userId == request.auth.uid;
    allow read: if request.auth != null
      && (resource.data.userId == request.auth.uid
        || (request.auth.token.email == "khansher7377@gmail.com"
          && request.auth.token.email_verified == true));
    allow update: if request.auth != null
      && request.auth.token.email == "khansher7377@gmail.com"
      && request.auth.token.email_verified == true
      && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(["status", "instaTracking"]);
    allow delete: if false;
  }

  match /storefront/{catalogId} {
    allow read: if catalogId == "catalog";
    allow create, update: if catalogId == "catalog"
      && request.auth != null
      && request.auth.token.email == "khansher7377@gmail.com"
      && request.auth.token.email_verified == true;
    allow delete: if false;
  }
  ```

  The admin dashboard is available at `/admin`. Sign in with the listed administrator account and verify its email before use. Open **Products & categories** to add, edit, or remove catalog items, update prices, stock quantities and pack sizes, and manage categories. The first admin visit copies the current built-in catalog into the `storefront/catalog` Firestore document; subsequent admin changes sync to the existing storefront without changing its layout. Product and category image fields accept an existing site path or an image URL. Stock levels are managed manually and are not automatically reduced when an order is placed. Apply these Firestore rules in Firebase Console; the admin interface check alone does not grant database access. Wishlists remain stored in this browser per Firebase user and are not synced between devices.
- Placeholders: payment collection, newsletter API and product review counts.
