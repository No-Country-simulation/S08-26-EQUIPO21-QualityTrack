import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DossierModule } from './modules/dossier/dossier.module';
import { QualityModule } from './modules/quality/quality.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { StatusHistoryModule } from './modules/status-history/status-history.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
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
