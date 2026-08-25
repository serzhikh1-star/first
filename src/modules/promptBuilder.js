import { config } from '../config/index.js';

export function buildPrompt(inputData, fieldsToGenerate, extraContext = '') {
  const inputStr = Object.entries(inputData)
    .map(([key, value]) => `"${key}": "${value}"`)
    .join(', ');

  const fieldsWithRules = fieldsToGenerate.map(field => {
    const rule = config.prompt.fieldRules[field] || 'Сгенерируй значение.';
    return `${field}: ${rule}`;
  }).join('\n');

  let prompt = `Входные данные о товаре:\n${inputStr}\n\nСгенерируй значения для следующих полей, соблюдая правила для каждого:\n\n${fieldsWithRules}`;

  if (extraContext) {
    prompt += `\n\nДополнительные требования и контекст:\n${extraContext}`;
  }

  prompt += `\n\nВерни JSON строго с этими ключами.`;
  return prompt;
}

export function getSystemInstruction() {
  return config.prompt.systemInstruction;
}