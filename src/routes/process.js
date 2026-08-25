import { processFile } from '../services/processingService.js';

export default async function processRoutes(fastify) {
  fastify.post('/api/process', async (request, reply) => {
    try {
      const { fileId, mapping, generateFields, inputFields, manualValues = {}, extraContext = '' } = request.body;

      if (!fileId || typeof mapping !== 'object' || !Array.isArray(generateFields) || !Array.isArray(inputFields)) {
        return reply.code(400).send({ error: 'Неверный формат запроса' });
      }

      const buffer = await processFile(fileId, { mapping, generateFields, inputFields, manualValues, extraContext });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="result.xlsx"');
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });
}