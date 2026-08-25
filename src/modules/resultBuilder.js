import ExcelJS from 'exceljs';
import { config } from '../config/index.js';
import { parseTemplateHeaders } from './excelParser.js';

/**
 * Создаёт выходной xlsx со структурой шаблона.
 * @param {object[]} rows - массив объектов, ключи = названия колонок шаблона
 * @returns {Promise<Buffer>}
 */
export async function buildOutputExcel(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Result');

  // Получаем заголовки из шаблона
  const headers = await parseTemplateHeaders(config.paths.templateFile);
  worksheet.addRow(headers);

  // Добавляем строки данных
  for (const row of rows) {
    const rowValues = headers.map(header => {
      const value = row[header];
      return value !== undefined && value !== null ? String(value) : '';
    });
    worksheet.addRow(rowValues);
  }

  // Возвращаем буфер
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}