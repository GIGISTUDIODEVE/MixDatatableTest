import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";

const db = getFirestore();

export const createUserDoc = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  await db.collection("users").doc(uid).set(
    {
      uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      providerIds: user.providerData?.map((p) => p.providerId) ?? [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      role: "user",
      isActive: true,
    },
    {merge: true}
  );
});
