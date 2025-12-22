const criticalForm = document.getElementById('criticalForm');
const mitigationForm = document.getElementById('mitigationForm');
const copyConfigButton = document.getElementById('copyConfig');
const saveConfigButton = document.getElementById('saveConfig');
const resetDefaultsButton = document.getElementById('resetDefaults');
const exportArea = document.getElementById('configExport');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function getFormPayload() {
  const criticalData = new FormData(criticalForm);
  const mitigationData = new FormData(mitigationForm);
  const payload = { ...Object.fromEntries(criticalData.entries()), ...Object.fromEntries(mitigationData.entries()) };
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, Number(value)])
  );
}

function fillForms(config) {
  const assign = (form, data) => {
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    });
  };
  assign(criticalForm, config);
  assign(mitigationForm, config);
  exportArea.value = JSON.stringify(config, null, 2);
}

function handleSave() {
  const payload = getFormPayload();
  const sanitized = FormulaConfig.save(payload);
  fillForms(sanitized);
  showToast('계산식 설정을 저장했습니다.');
}

function handleReset() {
  const sanitized = FormulaConfig.save(FormulaConfig.defaults);
  fillForms(sanitized);
  showToast('기본값으로 복원했습니다.');
}

function handleCopy() {
  exportArea.select();
  document.execCommand('copy');
  showToast('JSON을 복사했습니다.');
}

function init() {
  const config = FormulaConfig.load();
  fillForms(config);
  saveConfigButton.addEventListener('click', handleSave);
  resetDefaultsButton.addEventListener('click', handleReset);
  copyConfigButton.addEventListener('click', handleCopy);
  [criticalForm, mitigationForm].forEach((form) => {
    form.addEventListener('input', () => {
      const liveConfig = FormulaConfig.sanitize(getFormPayload());
      exportArea.value = JSON.stringify(liveConfig, null, 2);
    });
  });
}

init();
