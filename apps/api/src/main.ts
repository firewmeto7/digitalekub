import "dotenv/config";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  const configuredWebOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === configuredWebOrigin || origin === "http://127.0.0.1:3000") {
        callback(null, true);
        return;
      }

      try {
        const { hostname, protocol } = new URL(origin);
        callback(null, protocol === "https:" && hostname.endsWith("-3000.app.github.dev"));
      } catch {
        callback(null, false);
      }
    },
  });
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();