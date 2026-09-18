import { Controller, Get, UseGuards } from '@nestjs/common'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { User } from './entities/user.entity'
import { UsersService } from './users.service'

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
    constructor(private readonly usersService: UsersService) {}

    @Roles('admin')
    @Get('users')
    findAll(): User[] {
        return this.usersService.findAll()
    }
}
