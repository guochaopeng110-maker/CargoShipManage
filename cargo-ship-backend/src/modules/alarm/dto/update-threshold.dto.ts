import { PartialType } from '@nestjs/swagger';
import { CreateThresholdDto } from './create-threshold.dto';

/**
 * 更新阈值配置 DTO
 * 所有字段都是可选的
 */
export class UpdateThresholdDto extends PartialType(CreateThresholdDto) {}
