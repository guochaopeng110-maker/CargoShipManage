import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateEquipmentDto } from './create-equipment.dto';
import { EquipmentStatus } from '../../../database/entities/equipment.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 更新设备 DTO
 * 继承创建 DTO，所有字段都是可选的
 */
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {
  /**
   * 设备状态（可选）
   * normal: 正常
   * warning: 告警
   * fault: 故障
   * offline: 离线
   */
  @ApiPropertyOptional({
    description: '设备状态',
    enum: EquipmentStatus,
    example: EquipmentStatus.NORMAL,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus, { message: '设备状态无效' })
  status?: EquipmentStatus;
}
