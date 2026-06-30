import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Garden BE API",
      version: "1.0.0",
      description: "API documentation for Garden BE (Mental Health Support through Virtual/Real Plants)",
    },
    servers: [
      {
        url: "https://garden-be.vercel.app/api/v1",
        description: "Production Server",
      },
      {
        url: "http://localhost:3000/api/v1",
        description: "Local Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/api/**/*.route.ts", "./src/api/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

const outputPath = path.join(__dirname, '..', 'src', 'swagger-spec.ts');
const fileContent = `// Auto-generated file. Do not edit manually.\nexport const swaggerSpec = ${JSON.stringify(swaggerSpec, null, 2)};\n`;
fs.writeFileSync(outputPath, fileContent);
console.log('Generated src/swagger-spec.ts successfully');
