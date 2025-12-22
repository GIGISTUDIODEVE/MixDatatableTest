import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';
import { getDatabase, ref, get, set, child } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('[firebase] 초기화 실패: 구성 값을 확인하세요.', error);
  throw error;
}

(async () => {
  try {
    if (await analyticsSupported()) {
      getAnalytics(app);
    }
  } catch (error) {
    console.warn('[firebase] 애널리틱스 초기화가 건너뛰어졌습니다.', error);
  }
})();

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
