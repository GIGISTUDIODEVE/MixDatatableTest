import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, get, set, child } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBq6NYET2gBapgOi5Yh2aSePctsMA8Dr7U',
  authDomain: 'studydase.firebaseapp.com',
  databaseURL: 'https://studydase-default-rtdb.firebaseio.com',
  projectId: 'studydase',
  storageBucket: 'studydase.firebasestorage.app',
  messagingSenderId: '889952871801',
  appId: '1:889952871801:web:2739d10dd5b3291b563ba8',
  measurementId: 'G-JH3EBS40YM'
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export async function fetchPresets(path, fallback) {
  try {
    const snapshot = await get(child(ref(database), path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.error(`[firebase] '${path}'를 불러오지 못했습니다.`, error);
  }
  return fallback;
}

export async function savePresets(path, presets) {
  try {
    await set(ref(database, path), presets);
    return true;
  } catch (error) {
    console.error(`[firebase] '${path}'를 저장하지 못했습니다.`, error);
    return false;
  }
}
