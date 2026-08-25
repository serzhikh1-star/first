let currentFileId = null;
let currentDependencies = {};
let currentForbiddenIfValue = {};
let currentSelectOptions = {};
let currentRequiredFields = [];


// Работа с модальным окном помощи
const helpModal = document.getElementById('help-modal');
const helpBtn = document.getElementById('help-btn');
const closeHelpModal = document.getElementById('close-help-modal');

helpBtn.addEventListener('click', () => {
  helpModal.style.display = 'flex';
});

closeHelpModal.addEventListener('click', () => {
  helpModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === helpModal) {
    helpModal.style.display = 'none';
  }
});

// Обновление отображения имени файла
document.getElementById('file-input').addEventListener('change', function(e) {
  const fileName = this.files.length ? this.files[0].name : 'Файл не выбран';
  document.getElementById('file-name').textContent = fileName;
});

document.getElementById('upload-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('file-input');
  if (!fileInput.files.length) {
    alert('Выберите файл');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка загрузки');
    }

    const data = await response.json();
    currentFileId = data.fileId;
    currentDependencies = data.dependencies || {};
    currentForbiddenIfValue = data.forbiddenIfValue || {};
    currentSelectOptions = data.selectOptions || {};
    currentRequiredFields = data.requiredFields || [];

    renderMapping(
      data.sourceHeaders,
      data.templateHeaders,
      data.defaults,
      currentDependencies,
      currentSelectOptions,
      currentForbiddenIfValue,
      currentRequiredFields
    );
    document.getElementById('mapping-section').style.display = 'block';
    clearErrors();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
});

document.getElementById('process-btn').addEventListener('click', async () => {
  if (!currentFileId) {
    alert('Сначала загрузите файл');
    return;
  }

  if (!validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields)) {
    return;
  }

  const mapping = {};
  const generateFields = [];
  const inputFields = [];
  const manualValues = {};

  document.querySelectorAll('.template-row').forEach(row => {
    const templateField = row.dataset.field;
    const select = row.querySelector('.mapping-select');
    const checkGenerate = row.querySelector('.generate-check');
    const manualInput = row.querySelector('.manual-input');

    if (select && select.value) {
      mapping[templateField] = select.value;
    }
    if (checkGenerate && checkGenerate.checked) {
      generateFields.push(templateField);
    }
    if (manualInput && manualInput.value.trim() !== '') {
      manualValues[templateField] = manualInput.value.trim();
    }
  });

  document.querySelectorAll('.source-row').forEach(row => {
    const sourceField = row.dataset.field;
    const checkInput = row.querySelector('.input-check');
    if (checkInput && checkInput.checked) {
      inputFields.push(sourceField);
    }
  });

  const extraContext = document.getElementById('extra-context').value.trim();

  if (generateFields.length > 0 && inputFields.length === 0) {
    if (!confirm('Не отмечено ни одной исходной колонки для генерации. Продолжить?')) {
      return;
    }
  }

  const requestBody = {
    fileId: currentFileId,
    mapping,
    generateFields,
    inputFields,
    manualValues,
    extraContext,
  };

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка обработки');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
});

function renderMapping(sourceHeaders, templateHeaders, defaults = {}, dependencies = {}, selectOptions = {}, forbiddenIfValue = {}, requiredFields = []) {
  const templateContainer = document.getElementById('template-fields');
  const sourceContainer = document.getElementById('source-fields');

  templateContainer.innerHTML = '';
  sourceContainer.innerHTML = '';

  templateHeaders.forEach(header => {
    const row = document.createElement('div');
    row.className = 'field-row template-row';
    row.dataset.field = header;

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'generate-check';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(header));

    const select = document.createElement('select');
    select.className = 'mapping-select';
    select.innerHTML = '<option value="">-- не сопоставлено --</option>';
    sourceHeaders.forEach(src => {
      const option = document.createElement('option');
      option.value = src;
      option.textContent = src;
      select.appendChild(option);
    });

    let manualInput;
    if (selectOptions[header]) {
      manualInput = document.createElement('select');
      manualInput.className = 'manual-input';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- выбрать --';
      manualInput.appendChild(defaultOption);
      selectOptions[header].forEach(optValue => {
        const opt = document.createElement('option');
        opt.value = optValue;
        opt.textContent = optValue;
        manualInput.appendChild(opt);
      });
      manualInput.value = '';
      if (defaults[header] && selectOptions[header].includes(defaults[header])) {
        manualInput.value = defaults[header];
      }
    } else {
      manualInput = document.createElement('input');
      manualInput.type = 'text';
      manualInput.className = 'manual-input';
      manualInput.placeholder = 'Введите значение';
      if (defaults[header]) {
        manualInput.value = defaults[header];
      }
    }

    row.appendChild(label);
    row.appendChild(select);
    row.appendChild(manualInput);
    templateContainer.appendChild(row);

    select.addEventListener('change', () => validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields));
    checkbox.addEventListener('change', () => validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields));
    manualInput.addEventListener('change', () => validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields));
    manualInput.addEventListener('input', () => validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields));
  });

  sourceHeaders.forEach(header => {
    const row = document.createElement('div');
    row.className = 'field-row source-row';
    row.dataset.field = header;

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'input-check';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(header));

    row.appendChild(label);
    sourceContainer.appendChild(row);
  });

  validateDependencies(currentDependencies, currentForbiddenIfValue, currentRequiredFields);
}

function isFieldFilled(templateField) {
  const row = document.querySelector(`.template-row[data-field="${templateField}"]`);
  if (!row) return false;
  const select = row.querySelector('.mapping-select');
  const checkGenerate = row.querySelector('.generate-check');
  const manualInput = row.querySelector('.manual-input');

  if (select && select.value !== '') return true;
  if (checkGenerate && checkGenerate.checked) return true;
  if (manualInput && manualInput.value.trim() !== '') return true;
  return false;
}

function getFieldValue(templateField) {
  const row = document.querySelector(`.template-row[data-field="${templateField}"]`);
  if (!row) return null;
  const manualInput = row.querySelector('.manual-input');
  if (manualInput && manualInput.value.trim() !== '') {
    return manualInput.value.trim();
  }
  return null;
}

function validateDependencies(dependencies = {}, forbiddenIfValue = {}, requiredFields = []) {
  let valid = true;
  const errorContainer = document.getElementById('error-container');
  errorContainer.innerHTML = '';
  document.querySelectorAll('.template-row.error').forEach(el => el.classList.remove('error'));

  // Обязательные поля
  for (const field of requiredFields) {
    if (!isFieldFilled(field)) {
      valid = false;
      const row = document.querySelector(`.template-row[data-field="${field}"]`);
      if (row) row.classList.add('error');
      errorContainer.innerHTML += `Поле "${field}" обязательно для заполнения.<br>`;
    }
  }

  // Зависимости
  for (const [mainField, requiredDeps] of Object.entries(dependencies)) {
    const mainFilled = isFieldFilled(mainField);
    if (!mainFilled) continue;
    for (const depField of requiredDeps) {
      if (!isFieldFilled(depField)) {
        valid = false;
        const row = document.querySelector(`.template-row[data-field="${depField}"]`);
        if (row) row.classList.add('error');
        errorContainer.innerHTML += `Поле "${depField}" должно быть заполнено, так как указано "${mainField}".<br>`;
      }
    }
  }

  // Запреты
  for (const [fieldName, rules] of Object.entries(forbiddenIfValue)) {
    const actualValue = getFieldValue(fieldName);
    if (!actualValue) continue;
    for (const [ruleValue, forbiddenFields] of Object.entries(rules)) {
      if (actualValue === ruleValue) {
        for (const fbField of forbiddenFields) {
          if (isFieldFilled(fbField)) {
            valid = false;
            const fbRow = document.querySelector(`.template-row[data-field="${fbField}"]`);
            if (fbRow) fbRow.classList.add('error');
            errorContainer.innerHTML += `Поле "${fbField}" должно быть пустым, так как "${fieldName}" = "${ruleValue}".<br>`;
          }
        }
      }
    }
  }

  return valid;
}

function clearErrors() {
  const errorContainer = document.getElementById('error-container');
  errorContainer.innerHTML = '';
  document.querySelectorAll('.template-row.error').forEach(el => el.classList.remove('error'));
}