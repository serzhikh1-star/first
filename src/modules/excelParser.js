import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { config } from '../config/index.js';

/**
 * Парсит Excel из буфера.
 * @param {Buffer} buffer - содержимое файла
 * @param {number} maxRows - максимальное количество строк данных (без заголовка)
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function parseExcelFromBuffer(buffer, maxRows) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Файл не содержит листов');
  }

  const headers = [];
  const rows = [];

  // Первая строка — заголовки
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text.trim();
  });

  // Читаем данные строк, начиная со второй
  const totalDataRows = Math.min(worksheet.rowCount - 1, maxRows);
  for (let i = 2; i <= totalDataRows + 1; i++) {
    const row = worksheet.getRow(i);
    const rowData = {};
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      rowData[header] = cell.text.trim();
    });
    rows.push(rowData);
  }

  return { headers, rows };
}

/**
 * Читает заголовки из шаблонного файла.
 * @param {string} filePath - путь к файлу шаблона
 * @returns {Promise<string[]>}
 */
export async function parseTemplateHeaders(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text.trim();
  });
  return headers.filter(h => h !== ''); // убираем пустые названия, если есть
}


/**
 * Сохраняет буфер как xlsx файл в папке загрузок и возвращает имя файла.
 */
export async function saveUploadedFile(buffer) {
  const uploadDir = config.paths.uploadDir;
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${crypto.randomUUID()}.xlsx`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);
  return fileName;
}

/**
 * Читает xlsx файл с диска и возвращает данные (аналогично parseExcelFromBuffer).
 */
export async function parseExcelFromFile(filePath, maxRows) {
  const buffer = await fs.readFile(filePath);
  return parseExcelFromBuffer(buffer, maxRows);
}