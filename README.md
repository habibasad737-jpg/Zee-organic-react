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
      && (
        (request.auth.token.email == "khansher7377@gmail.com"
          && request.auth.token.email_verified == true
          && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(["status", "instaTracking"]))
        || (resource.data.userId == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(["status"])
          && (
            (resource.data.status in ["pending", "processing", "shipped"]
              && request.resource.data.status == "cancelled")
            || (resource.data.status == "delivered"
              && request.resource.data.status == "returned")
          ))
      );
    allow delete: if false;
  }

  match /reviews/{reviewId} {
    allow read: if true;
    allow create: if request.auth != null
      && request.resource.data.keys().hasAll([
        "userId", "userName", "orderId", "productId", "productName",
        "purchaseItem", "rating", "comment", "createdAt"
      ])
      && request.resource.data.keys().hasOnly([
        "userId", "userName", "orderId", "productId", "productName",
        "purchaseItem", "rating", "comment", "createdAt"
      ])
      && request.resource.data.userId == request.auth.uid
      && request.resource.data.userName is string
      && request.resource.data.userName.size() <= 100
      && request.resource.data.orderId is string
      && request.resource.data.productId is string
      && reviewId == request.resource.data.orderId
        + "_" + request.resource.data.productId
      && request.resource.data.productName
        == request.resource.data.purchaseItem.name
      && request.resource.data.purchaseItem.keys().hasAll([
        "id", "name", "price", "qty"
      ])
      && request.resource.data.purchaseItem.keys().hasOnly([
        "id", "name", "price", "qty"
      ])
      && request.resource.data.purchaseItem.id
        == request.resource.data.productId
      && request.resource.data.rating is int
      && request.resource.data.rating >= 1
      && request.resource.data.rating <= 5
      && request.resource.data.comment is string
      && request.resource.data.comment.size() > 0
      && request.resource.data.comment.size() <= 1000
      && request.resource.data.createdAt is timestamp
      && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId))
        .data.userId == request.auth.uid
      && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId))
        .data.status == "delivered"
      && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId))
        .data.items.hasAny([request.resource.data.purchaseItem]);
    allow update, delete: if false;
  }

  match /storefront/{catalogId} {
    allow read: if catalogId == "catalog";
    allow create, update: if catalogId == "catalog"
      && request.auth != null
      && request.auth.token.email == "khansher7377@gmail.com"
      && request.auth.token.email_verified == true;
    allow delete: if false;
  }

  match /adminProfiles/{userId} {
    allow read, write: if request.auth != null
      && request.auth.uid == userId
      && request.auth.token.email == "khansher7377@gmail.com"
      && request.auth.token.email_verified == true;
  }
  ```

  The admin dashboard is available at `/admin`. Sign in with the listed administrator account and verify its email before use. Open **Products & categories** to add, edit, or remove catalog items, update prices, stock quantities and pack sizes, and manage categories. The first admin visit copies the current built-in catalog into the `storefront/catalog` Firestore document; subsequent admin changes sync to the existing storefront without changing its layout. Product and category image fields accept an existing site path or an image URL. Stock levels are managed manually and are not automatically reduced when an order is placed. Apply these Firestore rules in Firebase Console; the admin interface check alone does not grant database access. Wishlists remain stored in this browser per Firebase user and are not synced between devices.
- Admin **Settings** stores the admin display name and contact phone in `adminProfiles/{uid}`. The sign-in email and verification status are shown from Firebase Authentication, and password reset is sent through Firebase. Add the `adminProfiles` rule above to enable profile saving.
- Product reviews can be submitted once per purchased item after an order is marked `delivered`. They are saved in the `reviews` collection and shown on the product page. Add the `reviews` Firestore rule above so reviews are public to read but can only be created by the owner of a delivered order containing the reviewed item.
- Customers can cancel their own pending, processing, or shipped orders, and mark delivered orders as returned. These status changes appear under **My Returns & Cancellations** and update the admin order list in real time. Website cancellation updates the order in this store only; it does not cancel a shipment in Insta World because no courier-cancellation integration is configured.
- Placeholders: payment collection and newsletter API.
