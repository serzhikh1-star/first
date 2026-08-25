import { parseExcelFromFile, parseTemplateHeaders } from '../modules/excelParser.js';
import { buildPrompt, getSystemInstruction } from '../modules/promptBuilder.js';
import { generateWithRetry, waitBetweenRows } from '../modules/geminiClient.js';
import { buildOutputExcel } from '../modules/resultBuilder.js';
import { config } from '../config/index.js';
import path from 'path';

export async function processFile(fileId, { mapping, generateFields, inputFields, manualValues = {}, extraContext = '' }) {
  const filePath = path.join(config.paths.uploadDir, fileId);
  const { headers: sourceHeaders, rows: sourceRows } = await parseExcelFromFile(filePath, config.app.maxRows);

  const templateHeaders = await parseTemplateHeaders(config.paths.templateFile);
  const systemInstruction = getSystemInstruction();

  const results = [];

  for (const sourceRow of sourceRows) {
    // 1. Собираем входные данные из отмеченных чекбоксами колонок
    const inputData = {};

    // Добавляем данные из inputFields (правая панель)
    for (const col of inputFields) {
      if (sourceHeaders.includes(col)) {
        inputData[col] = sourceRow[col];
      }
    }

    // 2. Автоматически добавляем значения сопоставленных колонок для генерируемых полей
    for (const field of generateFields) {
      if (mapping[field]) {
        const sourceCol = mapping[field];
        // Добавляем только если её ещё нет в inputData, чтобы не дублировать
        if (sourceHeaders.includes(sourceCol) && !(sourceCol in inputData)) {
          inputData[sourceCol] = sourceRow[sourceCol];
        }
      }
    }

    // 3. Отправляем на генерацию, если есть что генерировать и есть контекст
    let generatedData = {};
    if (generateFields.length > 0 && Object.keys(inputData).length > 0) {
      const prompt = buildPrompt(inputData, generateFields, extraContext);
      const response = await generateWithRetry(prompt, systemInstruction);
      if (response) {
        generatedData = {};
        for (const field of generateFields) {
          if (response[field] !== undefined) {
            generatedData[field] = response[field];
          }
        }
      }
    }

    // 4. Формируем итоговую строку с новыми приоритетами:
    //    генерация -> сопоставление -> ручной ввод -> значение по умолчанию -> пусто
    const resultRow = {};
    for (const templateHeader of templateHeaders) {
      if (generateFields.includes(templateHeader)) {
        resultRow[templateHeader] = generatedData[templateHeader] ?? '';
      } else if (mapping[templateHeader]) {
        resultRow[templateHeader] = sourceRow[mapping[templateHeader]] ?? '';
      } else if (manualValues[templateHeader] !== undefined && manualValues[templateHeader] !== '') {
        resultRow[templateHeader] = manualValues[templateHeader];
      } else if (config.prompt.defaults[templateHeader]) {
        resultRow[templateHeader] = config.prompt.defaults[templateHeader];
      } else {
        resultRow[templateHeader] = '';
      }
    }

    results.push(resultRow);
    await waitBetweenRows();
  }

  const outputBuffer = await buildOutputExcel(results);
  return outputBuffer;
}