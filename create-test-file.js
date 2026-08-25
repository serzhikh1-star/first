import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');

worksheet.addRow(['Код_товара', 'Название', 'Цена']);
worksheet.addRow(['001', 'Товар 1', '100']);
worksheet.addRow(['002', 'Товар 2', '200']);

await workbook.xlsx.writeFile('./data/test.xlsx');
console.log('Тестовый файл создан: ./data/test.xlsx');