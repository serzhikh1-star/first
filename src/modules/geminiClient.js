import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

function getDelayMs() {
  if (config.gemini.delayBetweenRequestsMs) {
    return config.gemini.delayBetweenRequestsMs;
  }
  return (60 / config.gemini.requestsPerMinute) * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Извлекает и парсит JSON из текста, устойчиво к лишним символам.
 */
function parseJsonFromText(text) {
  if (!text) return null;

  // Убираем возможные markdown-обёртки ```json ... ```
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Находим первый '{' и последний '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function generateWithRetry(prompt, systemInstruction = '') {
  let lastError = null;

  for (let attempt = 1; attempt <= config.gemini.maxRetries; attempt++) {
    try {
      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      };
      if (systemInstruction) {
        request.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const result = await model.generateContent(request);
      const text = result.response.text();
      
      const parsed = parseJsonFromText(text);
      if (parsed) {
        return parsed;
      } else {
        throw new Error('Не удалось извлечь валидный JSON из ответа');
      }
    } catch (err) {
      lastError = err;
      console.error(`Попытка ${attempt} не удалась:`, err.message);
      if (attempt < config.gemini.maxRetries) {
        const delay = getDelayMs();
        console.log(`Ожидание ${delay} мс перед следующей попыткой...`);
        await sleep(delay);
      }
    }
  }

  console.error('Все попытки исчерпаны, возвращаем null.');
  return null;
}

export async function waitBetweenRows() {
  const delay = getDelayMs();
  if (delay > 0) {
    await sleep(delay);
  }
}