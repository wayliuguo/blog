import { Injectable } from '@nestjs/common'

@Injectable()
export class ConfigService {
    private readonly env: Record<string, string> = {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '3306',
        REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT || '5000'
    }

    get(key: string): string | undefined {
        return this.env[key]
    }
}
