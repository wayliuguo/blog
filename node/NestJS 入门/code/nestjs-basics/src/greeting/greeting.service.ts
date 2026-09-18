import { Injectable } from '@nestjs/common'

@Injectable()
export class GreetingService {
    hello(name: string): string {
        return `Hello, ${name}!`
    }
}
