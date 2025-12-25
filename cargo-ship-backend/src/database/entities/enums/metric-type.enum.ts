/**
 * 指标类型枚举
 *
 * 表示物理测量类型
 */
export enum MetricType {
  /** 温度 */
  TEMPERATURE = 'temperature',
  /** 压力 */
  PRESSURE = 'pressure',
  /** 湿度 */
  HUMIDITY = 'humidity',
  /** 振动 */
  VIBRATION = 'vibration',
  /** 速度/转速 */
  SPEED = 'speed',
  /** 电流 */
  CURRENT = 'current',
  /** 电压 */
  VOLTAGE = 'voltage',
  /** 功率 */
  POWER = 'power',
  /** 频率 */
  FREQUENCY = 'frequency',
  /** 液位 */
  LEVEL = 'level',
  /** 电阻 */
  RESISTANCE = 'resistance',
  /** 开关状态 */
  SWITCH = 'switch',
}
