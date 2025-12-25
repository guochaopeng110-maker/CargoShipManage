import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_DATABASE || 'cargo_ships_db',
  synchronize: false,
  logging: false,
});

async function run() {
  await dataSource.initialize();
  console.log('Database connected');

  try {
    const result = await dataSource.query('SHOW CREATE TABLE time_series_data');
    console.log('Table structure:', result[0]['Create Table']);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

run();
