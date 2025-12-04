import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建时序监测数据表的数据库迁移
 *
 * 功能：
 * 1. 创建time_series_data表
 * 2. 配置MySQL分区表（按月分区）
 * 3. 创建外键约束
 * 4. 创建优化索引
 */
export class CreateTimeSeriesDataTable1732000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 先删除表（如果存在）- 处理之前失败的迁移
    await queryRunner.query(`DROP TABLE IF EXISTS time_series_data;`);

    // 2. 使用原生SQL创建带分区的表
    // 注意：MySQL分区表不支持外键约束，所以直接创建分区表，不使用外键
    await queryRunner.query(`
      CREATE TABLE time_series_data (
        id BIGINT AUTO_INCREMENT COMMENT '自增主键',
        equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID（核心字段，必填）',
        timestamp DATETIME NOT NULL COMMENT '数据时间戳（核心字段，必填）',
        metric_type ENUM('vibration', 'temperature', 'pressure', 'humidity', 'speed', 'current', 'voltage', 'power') NOT NULL COMMENT '指标类型（核心字段，必填）',
        value DECIMAL(10, 2) NOT NULL COMMENT '指标数值（核心字段，必填）',
        unit VARCHAR(20) NULL COMMENT '数据单位（可选）',
        quality ENUM('normal', 'abnormal', 'suspicious') NOT NULL DEFAULT 'normal' COMMENT '数据质量标记',
        source ENUM('sensor-upload', 'file-import', 'manual-entry') NOT NULL DEFAULT 'sensor-upload' COMMENT '数据来源',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (id, timestamp),
        INDEX idx_equipment_time (equipment_id, timestamp),
        INDEX idx_equipment_metric_time (equipment_id, metric_type, timestamp),
        INDEX idx_metric_type (metric_type),
        INDEX idx_quality (quality),
        INDEX idx_source (source)
      ) ENGINE=InnoDB ROW_FORMAT=COMPRESSED
      PARTITION BY RANGE (YEAR(timestamp) * 100 + MONTH(timestamp)) (
        PARTITION p202511 VALUES LESS THAN (202512) COMMENT = '2025年11月分区',
        PARTITION p202512 VALUES LESS THAN (202601) COMMENT = '2025年12月分区',
        PARTITION p202601 VALUES LESS THAN (202602) COMMENT = '2026年1月分区',
        PARTITION p202602 VALUES LESS THAN (202603) COMMENT = '2026年2月分区',
        PARTITION p202603 VALUES LESS THAN (202604) COMMENT = '2026年3月分区',
        PARTITION p202604 VALUES LESS THAN (202605) COMMENT = '2026年4月分区',
        PARTITION p202605 VALUES LESS THAN (202606) COMMENT = '2026年5月分区',
        PARTITION p202606 VALUES LESS THAN (202607) COMMENT = '2026年6月分区',
        PARTITION p202607 VALUES LESS THAN (202608) COMMENT = '2026年7月分区',
        PARTITION p202608 VALUES LESS THAN (202609) COMMENT = '2026年8月分区',
        PARTITION p202609 VALUES LESS THAN (202610) COMMENT = '2026年9月分区',
        PARTITION p202610 VALUES LESS THAN (202611) COMMENT = '2026年10月分区',
        PARTITION p202611 VALUES LESS THAN (202612) COMMENT = '2026年11月分区',
        PARTITION p202612 VALUES LESS THAN (202701) COMMENT = '2026年12月分区',
        PARTITION p_future VALUES LESS THAN MAXVALUE COMMENT = '未来数据分区'
      );
    `);

    // 注意：由于分区表不支持外键，数据一致性需要在应用层维护
    // 在TimeSeriesData实体中使用@ManyToOne关系，但不使用数据库级外键
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除表（会自动删除所有索引和分区）
    await queryRunner.dropTable('time_series_data');
  }
}
