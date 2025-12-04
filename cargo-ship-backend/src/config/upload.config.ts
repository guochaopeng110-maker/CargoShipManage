/**
 * 文件上传配置模块
 *
 * @description
 * 配置文件上传功能的各项参数，包括：
 * - 上传文件大小限制
 * - 文件存储目录路径
 *
 * @author 系统生成
 * @date 2024-01-15
 */

import { registerAs } from '@nestjs/config';

/**
 * 导出上传配置对象
 *
 * 使用NestJS的registerAs注册为命名配置，可通过@Inject('upload')或ConfigService注入
 *
 * @returns {Object} 上传配置对象
 * @property {number} maxFileSize - 最大文件大小（字节），默认10MB
 * @property {string} uploadDir - 文件上传目录，默认'./uploads'
 *
 * @环境变量
 * - MAX_FILE_SIZE: 最大文件大小（字节），如: 10485760 (10MB)
 * - UPLOAD_DIR: 上传目录路径，如: './uploads' 或 '/var/www/uploads'
 *
 * @安全建议
 * 1. 根据业务需求合理设置文件大小限制，防止磁盘空间被耗尽
 * 2. 确保上传目录有适当的读写权限
 * 3. 建议使用绝对路径或相对于项目根目录的路径
 * 4. 生产环境建议使用专门的文件存储服务（如OSS、S3）
 *
 * @示例
 * ```typescript
 * // 在服务中使用
 * constructor(
 *   @Inject('upload') private uploadConfig: ConfigType<typeof uploadConfig>,
 * ) {}
 *
 * // 检查文件大小
 * if (file.size > this.uploadConfig.maxFileSize) {
 *   throw new BadRequestException('文件大小超过限制');
 * }
 *
 * // 构建文件路径
 * const filePath = path.join(this.uploadConfig.uploadDir, filename);
 * ```
 *
 * @注意事项
 * - 文件大小单位为字节：1MB = 1024 * 1024 bytes
 * - 确保上传目录在应用启动前已创建
 * - 定期清理临时文件和过期文件
 */
export default registerAs('upload', () => ({
  /**
   * 最大文件大小（字节）
   * 默认: 10MB (10485760 bytes)
   *
   * 常见大小参考:
   * - 1MB: 1048576
   * - 5MB: 5242880
   * - 10MB: 10485760
   * - 50MB: 52428800
   */
  maxFileSize:
    parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) || 10485760, // 10MB

  /**
   * 文件上传存储目录
   * 默认: './uploads' (相对于项目根目录)
   *
   * 路径格式:
   * - 相对路径: './uploads' 或 'uploads'
   * - 绝对路径: '/var/www/uploads' 或 'C:\\uploads'
   *
   * 注意: 确保目录存在且有写入权限
   */
  uploadDir: process.env.UPLOAD_DIR || './uploads',
}));
