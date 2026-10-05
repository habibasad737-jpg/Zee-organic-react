import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export const deliveryStorageKey = (uid) => `zee-delivery:${uid}`;

export const makeDeliveryInfo = (user) => ({
  fullName: user.displayName || "",
  phone: user.phoneNumber || "",
  province: "",
  city: "",
  building: "",
  area: "",
  locality: "",
  address: "",
  label: "home",
});

const profileReference = (user) => doc(db, "customerProfiles", user.uid);

const mergeDeliveryInfo = (user, savedInfo = {}) => {
  const defaults = makeDeliveryInfo(user);
  const deliveryInfo = Object.fromEntries(
    Object.keys(defaults).map((field) => [
      field,
      typeof savedInfo[field] === "string" ? savedInfo[field] : defaults[field],
    ]),
  );
  deliveryInfo.label = savedInfo.label === "office" ? "office" : "home";
  return deliveryInfo;
};

const readLegacyDeliveryInfo = (user) => {
  const saved = localStorage.getItem(deliveryStorageKey(user.uid));
  if (!saved) return null;

  const legacyInfo = JSON.parse(saved);
  if (
    !legacyInfo ||
    typeof legacyInfo !== "object" ||
    Array.isArray(legacyInfo)
  ) {
    throw new Error("Saved delivery information has an invalid format.");
  }

  return mergeDeliveryInfo(user, legacyInfo);
};

export async function loadDeliveryInfo(user) {
  let profileSnapshot;
  try {
    profileSnapshot = await getDoc(profileReference(user));
  } catch (loadError) {
    try {
      const legacyInfo = readLegacyDeliveryInfo(user);
      if (legacyInfo) {
        return {
          deliveryInfo: legacyInfo,
          syncWarning:
            "Showing this browser's saved details because your account profile could not be loaded.",
        };
      }
    } catch (legacyError) {
      console.error(
        "Unable to read legacy browser-saved delivery information.",
        legacyError,
      );
    }
    throw loadError;
  }

  if (profileSnapshot.exists()) {
    return {
      deliveryInfo: mergeDeliveryInfo(user, profileSnapshot.data()),
      syncWarning: "",
    };
  }

  const legacyInfo = readLegacyDeliveryInfo(user);
  if (!legacyInfo) {
    return { deliveryInfo: makeDeliveryInfo(user), syncWarning: "" };
  }

  try {
    await saveDeliveryInfo(user, legacyInfo);
    return { deliveryInfo: legacyInfo, syncWarning: "" };
  } catch (migrationError) {
    console.error(
      "Unable to migrate browser-saved delivery information to the account.",
      migrationError,
    );
    return {
      deliveryInfo: legacyInfo,
      syncWarning:
        "Showing this browser's saved details. They could not be synced to your account yet.",
    };
  }
}

export async function saveDeliveryInfo(user, deliveryInfo) {
  await setDoc(
    profileReference(user),
    {
      ...mergeDeliveryInfo(user, deliveryInfo),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
