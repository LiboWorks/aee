import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ScraperService } from './scraper.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ScraperService],
  exports: [ProductService],
})
export class ProductModule {}
