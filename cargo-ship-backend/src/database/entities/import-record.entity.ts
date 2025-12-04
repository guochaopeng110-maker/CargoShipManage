import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Equipment } from './equipment.entity';

/**
 * 文件格式枚举
 */
export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
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
export interface ImportError {
  row: number; // 行号
  data: any; // 原始数据
  reason: string; // 失败原因
  batch?: number; // 批次号
}

/**
 * 数据导入记录实体
 * 记录每次文件导入操作的详细结果
 */
@Entity('import_records')
export class ImportRecord {
  /**
   * 主键ID (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 导入文件名
   */
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: false })
  fileName: string;

  /**
   * 文件格式
   */
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
  @Column({ name: 'file_size', type: 'int', nullable: false })
  fileSize: number;

  /**
   * 目标设备ID（可选，多设备导入时为NULL）
   */
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
  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  /**
   * 成功导入条数
   */
  @Column({ name: 'success_rows', type: 'int', default: 0 })
  successRows: number;

  /**
   * 失败条数
   */
  @Column({ name: 'failed_rows', type: 'int', default: 0 })
  failedRows: number;

  /**
   * 跳过条数（如重复数据）
   */
  @Column({ name: 'skipped_rows', type: 'int', default: 0 })
  skippedRows: number;

  /**
   * 重复数据处理策略
   */
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
  @Column({ name: 'errors', type: 'json', nullable: true })
  errors: ImportError[];

  /**
   * 开始处理时间
   */
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  /**
   * 完成时间
   */
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  /**
   * 导入操作人ID
   */
  @Column({ name: 'imported_by', type: 'varchar', length: 36, nullable: false })
  importedBy: string;

  /**
   * 创建时间
   */
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
