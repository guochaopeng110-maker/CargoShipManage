import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Equipment } from './equipment.entity';

/**
 * 文件格式枚举
 * 支持的格式: Excel, CSV, JSON
 */
export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 导入状态枚举
 */
export enum ImportStatus {
  PENDING = 'pending', // 待处理
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  PARTIAL = 'partial', // 部分成功
  FAILED = 'failed', // 失败
}

/**
 * 重复数据处理策略枚举
 */
export enum DuplicateStrategy {
  SKIP = 'skip', // 跳过
  OVERWRITE = 'overwrite', // 覆盖
}

/**
 * 导入错误详情接口
 */
export class ImportError {
  @ApiProperty({
    description: '行号',
    example: 2,
    type: Number,
  })
  row: number; // 行号

  @ApiProperty({
    description: '原始数据',
    example: { equipmentId: 'SYS-BAT-001', timestamp: '2025-01-01 10:00:00' },
  })
  data: any; // 原始数据

  @ApiProperty({
    description: '失败原因',
    example: '设备ID不存在',
    type: String,
  })
  reason: string; // 失败原因

  @ApiPropertyOptional({
    description: '批次号',
    example: 1,
    type: Number,
  })
  batch?: number; // 批次号
}

/**
 * 数据导入记录实体
 * 记录每次文件导入操作的详细结果
 */
@ApiExtraModels(ImportError)
@Entity('import_records')
export class ImportRecord {
  /**
   * 主键ID (UUID)
   */
  @ApiProperty({
    description: '导入记录ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 导入文件名
   */
  @ApiProperty({
    description: '导入文件名',
    example: 'monitoring_data_20251214.xlsx',
    type: String,
    maxLength: 255,
  })
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: false })
  fileName: string;

  /**
   * 文件格式
   */
  @ApiProperty({
    enum: FileFormat,
    description: '文件格式',
    example: FileFormat.EXCEL,
  })
  @Column({
    name: 'file_format',
    type: 'enum',
    enum: FileFormat,
    nullable: false,
  })
  fileFormat: FileFormat;

  /**
   * 文件大小（字节）
   */
  @ApiProperty({
    description: '文件大小（字节）',
    example: 102400,
    type: Number,
  })
  @Column({ name: 'file_size', type: 'int', nullable: false })
  fileSize: number;

  /**
   * 目标设备ID（可选，多设备导入时为NULL）
   */
  @ApiPropertyOptional({
    description: '目标设备ID（UUID格式），多设备导入时为null',
    example: 'e1f2g3h4-i5j6-7890-klmn-op1234567890',
    type: String,
  })
  @Column({ name: 'equipment_id', type: 'varchar', length: 36, nullable: true })
  equipmentId: string;

  /**
   * 关联的设备实体
   */
  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * 导入状态
   */
  @ApiProperty({
    enum: ImportStatus,
    description: '导入状态',
    example: ImportStatus.COMPLETED,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING,
  })
  status: ImportStatus;

  /**
   * 总数据条数
   */
  @ApiProperty({
    description: '总数据条数',
    example: 1000,
    type: Number,
    default: 0,
  })
  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  /**
   * 成功导入条数
   */
  @ApiProperty({
    description: '成功导入条数',
    example: 980,
    type: Number,
    default: 0,
  })
  @Column({ name: 'success_rows', type: 'int', default: 0 })
  successRows: number;

  /**
   * 失败条数
   */
  @ApiProperty({
    description: '失败条数',
    example: 15,
    type: Number,
    default: 0,
  })
  @Column({ name: 'failed_rows', type: 'int', default: 0 })
  failedRows: number;

  /**
   * 跳过条数（如重复数据）
   */
  @ApiProperty({
    description: '跳过条数（如重复数据）',
    example: 5,
    type: Number,
    default: 0,
  })
  @Column({ name: 'skipped_rows', type: 'int', default: 0 })
  skippedRows: number;

  /**
   * 重复数据处理策略
   */
  @ApiProperty({
    enum: DuplicateStrategy,
    description: '重复数据处理策略',
    example: DuplicateStrategy.SKIP,
    default: DuplicateStrategy.SKIP,
  })
  @Column({
    name: 'duplicate_strategy',
    type: 'enum',
    enum: DuplicateStrategy,
    default: DuplicateStrategy.SKIP,
  })
  duplicateStrategy: DuplicateStrategy;

  /**
   * 错误详情（JSON格式）
   */
  @ApiPropertyOptional({
    type: [ImportError],
    description: '错误详情（JSON格式）',
  })
  @Column({ name: 'errors', type: 'json', nullable: true })
  errors: ImportError[];

  /**
   * 开始处理时间
   */
  @ApiPropertyOptional({
    description: '开始处理时间',
    example: '2025-12-14T10:00:00.000Z',
    type: Date,
  })
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  /**
   * 完成时间
   */
  @ApiPropertyOptional({
    description: '完成时间',
    example: '2025-12-14T10:05:30.000Z',
    type: Date,
  })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * 导入操作人ID
   */
  @ApiProperty({
    description: '导入操作人ID（UUID格式）',
    example: 'f1g2h3i4-j5k6-7890-lmno-pq1234567890',
    type: String,
  })
  @Column({ name: 'imported_by', type: 'varchar', length: 36, nullable: false })
  importedBy: string;

  /**
   * 创建时间
   */
  @ApiProperty({
    description: '记录创建时间',
    example: '2025-12-14T09:59:00.000Z',
    type: Date,
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 判断是否处理中
   */
  isProcessing(): boolean {
    return this.status === ImportStatus.PROCESSING;
  }

  /**
   * 判断是否已完成
   */
  isCompleted(): boolean {
    return this.status === ImportStatus.COMPLETED;
  }

  /**
   * 判断是否失败
   */
  isFailed(): boolean {
    return this.status === ImportStatus.FAILED;
  }

  /**
   * 计算成功率
   */
  getSuccessRate(): number {
    if (this.totalRows === 0) return 0;
    return Math.round((this.successRows / this.totalRows) * 10000) / 100;
  }

  /**
   * 获取处理时长（毫秒）
   */
  getProcessingDuration(): number | null {
    if (!this.startedAt || !this.completedAt) return null;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
}
