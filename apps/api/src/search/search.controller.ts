import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SearchService } from './search.service';
import { CreateSearchDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSearchDto) {
    return this.search.create(user.id, dto);
  }

  // Важно: статичный путь history объявляем до :id, иначе перехватит динамический маршрут.
  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.search.history(user.id);
  }

  @Get(':id')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.search.getStatus(user.id, id);
  }

  @Get(':id/results')
  results(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.search.getResults(user.id, id);
  }
}
