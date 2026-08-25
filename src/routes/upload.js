import { parseExcelFromBuffer, parseTemplateHeaders, saveUploadedFile } from '../modules/excelParser.js';
import { config } from '../config/index.js';

export default async function uploadRoutes(fastify) {
  fastify.post('/api/upload', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'Файл не загружен' });
      }

      const buffer = await data.toBuffer();
      const { headers, rows } = await parseExcelFromBuffer(buffer, config.app.maxRows);

      // Сохраняем файл
      const fileId = await saveUploadedFile(buffer);

      const templateHeaders = await parseTemplateHeaders(config.paths.templateFile);

return {
  fileId,
  sourceHeaders: headers,
  previewRows: rows.slice(0, 5),
  templateHeaders,
  totalRows: rows.length,
  defaults: config.prompt.defaults || {},
  dependencies: config.dependencies || {},
  forbiddenIfValue: config.forbiddenIfValue || {},
  selectOptions: config.selectOptions || {},
  requiredFields: config.requiredFields || [],
};
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });
}