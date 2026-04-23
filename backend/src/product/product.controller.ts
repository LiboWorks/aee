import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProductService } from './product.service';
import { CreateProductDto } from './product.dto';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateProductDto) {
    return this.productService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.productService.findAllByUser(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.findOne(id, user.userId);
  }
}
