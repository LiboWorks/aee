import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ScraperService } from './scraper.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [ProductService, ScraperService],
  exports: [ProductService],
})
export class ProductModule {}
