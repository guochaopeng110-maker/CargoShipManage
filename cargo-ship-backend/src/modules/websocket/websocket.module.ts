import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';

/**
 * WebSocket 模块
 *
 * 提供实时双向通信能力
 * - WebSocket网关服务
 * - JWT认证集成
 * - 房间管理
 * - 消息推送
 */
@Module({
  imports: [
    // 导入JWT模块用于认证
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') || 'your-secret-key';
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway], // 导出供其他模块使用
})
export class WebsocketModule {}
