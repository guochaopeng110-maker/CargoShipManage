import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 移除 XML 文件格式支持
 * 只保留 EXCEL, CSV, JSON 三种格式
 */
export class RemoveXmlFileFormat1732560000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 修改 file_format 枚举,移除 'xml'
    await queryRunner.query(`
      ALTER TABLE \`import_records\`
      MODIFY COLUMN \`file_format\` ENUM('excel', 'csv', 'json') NOT NULL
      COMMENT '文件格式'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复 'xml' 枚举值
    await queryRunner.query(`
      ALTER TABLE \`import_records\`
      MODIFY COLUMN \`file_format\` ENUM('excel', 'csv', 'json', 'xml') NOT NULL
      COMMENT '文件格式'
    `);
  }
}
