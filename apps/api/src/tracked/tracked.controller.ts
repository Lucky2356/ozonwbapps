import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { TrackedService } from './tracked.service';
import { CreateTrackedDto, UpdateTrackedDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('tracked-products')
export class TrackedController {
  constructor(private readonly tracked: TrackedService) {}

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: CreateTrackedDto) {
    return this.tracked.add(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tracked.list(user.id);
  }

  @Post(':id/check')
  check(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tracked.requestCheck(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTrackedDto) {
    return this.tracked.updateTarget(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tracked.remove(user.id, id);
  }
}
