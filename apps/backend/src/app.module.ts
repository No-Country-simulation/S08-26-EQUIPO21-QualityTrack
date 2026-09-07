import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import { DossierModule } from './modules/dossier/dossier.module';
import { QualityModule } from './modules/quality/quality.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { StatusHistoryModule } from './modules/status-history/status-history.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Carga apps/backend/.env y valida las variables antes del bootstrap.
    // isGlobal: no hace falta reimportar ConfigModule en cada módulo.
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate }),
    PrismaModule,
    DossierModule,
    QualityModule,
    QuotesModule,
    WorkOrdersModule,
    StatusHistoryModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
