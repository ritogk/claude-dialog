import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = this.configService.get<string>('apiKey');

    // If API_KEY is not set or empty, skip validation (local dev mode)
    if (!expectedApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const providedApiKey = request.headers['x-api-key'];

    if (!providedApiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    if (providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
