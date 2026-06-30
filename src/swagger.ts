import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

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

export const setupSwagger = (app: Express) => {
  const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css";
  const customJs = [
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
    "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
  ];

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCssUrl: CSS_URL,
    customJs: customJs,
  }));
};
