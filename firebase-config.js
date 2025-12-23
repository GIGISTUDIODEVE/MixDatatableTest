// Firebase configuration input helper
const CONFIG_FIELDS = [
  { key: "apiKey", label: "API Key" },
  { key: "authDomain", label: "Auth Domain" },
  { key: "databaseURL", label: "Database URL" },
  { key: "projectId", label: "Project ID" },
  { key: "storageBucket", label: "Storage Bucket" },
  { key: "messagingSenderId", label: "Messaging Sender ID" },
  { key: "appId", label: "App ID" },
  { key: "measurementId", label: "Measurement ID" },
];

const COOKIE_PREFIX = "firebaseConfig_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function parseCookies() {
  return document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, chunk) => {
      const [name, ...rest] = chunk.split("=");
      acc[name] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

function loadConfigFromCookies() {
  const cookies = parseCookies();
  const config = {};
  for (const { key } of CONFIG_FIELDS) {
    const cookieKey = `${COOKIE_PREFIX}${key}`;
    if (!cookies[cookieKey]) {
      return null;
    }
    config[key] = cookies[cookieKey];
  }
  return config;
}

function saveConfigToCookies(config) {
  CONFIG_FIELDS.forEach(({ key }) => {
    const value = config[key] ?? "";
    document.cookie = `${COOKIE_PREFIX}${key}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  });
}

function ensureStyles() {
  if (document.getElementById("firebase-config-style")) return;
  const style = document.createElement("style");
  style.id = "firebase-config-style";
  style.textContent = `
    .firebase-config-backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      z-index: 9999;
    }
    .firebase-config-modal {
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 1.2rem 1.4rem;
      width: min(520px, 92vw);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.35);
      font-family: "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .firebase-config-modal h2 {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
    }
    .firebase-config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem 0.9rem;
    }
    .firebase-config-field label {
      display: block;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }
    .firebase-config-field input {
      width: 100%;
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #0b1220;
      color: #e2e8f0;
    }
    .firebase-config-actions {
      margin-top: 1rem;
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .firebase-config-button {
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.1s ease, filter 0.15s ease;
      background: linear-gradient(90deg, #3b82f6, #06b6d4);
      color: #0b1220;
    }
    .firebase-config-button:hover {
      filter: brightness(1.05);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
}

function createConfigModal(existingValues = {}) {
  ensureStyles();

  const backdrop = document.createElement("div");
  backdrop.className = "firebase-config-backdrop";

  const modal = document.createElement("div");
  modal.className = "firebase-config-modal";

  const title = document.createElement("h2");
  title.textContent = "Firebase 설정을 입력하세요";

  const description = document.createElement("p");
  description.textContent = "한 번 입력하면 쿠키에 저장되어 다음에도 자동으로 사용됩니다.";

  const form = document.createElement("form");
  const grid = document.createElement("div");
  grid.className = "firebase-config-grid";

  const inputs = new Map();

  CONFIG_FIELDS.forEach(({ key, label }) => {
    const field = document.createElement("div");
    field.className = "firebase-config-field";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.setAttribute("for", `firebase-${key}`);

    const input = document.createElement("input");
    input.id = `firebase-${key}`;
    input.name = key;
    input.required = true;
    input.value = existingValues[key] ?? "";

    field.append(labelEl, input);
    grid.appendChild(field);
    inputs.set(key, input);
  });

  const actions = document.createElement("div");
  actions.className = "firebase-config-actions";
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "firebase-config-button";
  submitBtn.textContent = "확인";
  actions.appendChild(submitBtn);

  form.append(grid, actions);
  modal.append(title, description, form);
  backdrop.appendChild(modal);

  return { backdrop, form, inputs };
}

async function requestConfigWithForm(prefill = {}) {
  return new Promise((resolve) => {
    const { backdrop, form, inputs } = createConfigModal(prefill);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const config = {};
      for (const { key } of CONFIG_FIELDS) {
        const value = inputs.get(key).value.trim();
        if (!value) {
          inputs.get(key).focus();
          return;
        }
        config[key] = value;
      }
      saveConfigToCookies(config);
      document.body.removeChild(backdrop);
      resolve(config);
    });

    document.body.appendChild(backdrop);
  });
}

export async function getFirebaseConfig() {
  const savedConfig = loadConfigFromCookies();
  if (savedConfig) {
    return savedConfig;
  }
  const partial = {};
  const cookies = parseCookies();
  CONFIG_FIELDS.forEach(({ key }) => {
    const cookieKey = `${COOKIE_PREFIX}${key}`;
    if (cookies[cookieKey]) {
      partial[key] = cookies[cookieKey];
    }
  });
  return requestConfigWithForm(partial);
}
