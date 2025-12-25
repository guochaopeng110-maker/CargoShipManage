import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ==========================================
// 1. 配置区域 (Configuration)
// ==========================================

const API_BASE_URL = 'http://localhost:3008';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

// 8个固定设备列表 (Hardcoded Equipment List)
const EQUIPMENT_LIST = [
  {
    deviceId: 'SYS-INV-1-001',
    uuid: '495a6ea7-981c-420e-89c0-cf0f12a4a076',
    name: '1#日用逆变器系统',
  },
  {
    deviceId: 'SYS-COOL-001',
    uuid: '880f47cc-e160-4855-bbec-ae3805fc70f8',
    name: '冷却水泵系统',
  },
  {
    deviceId: 'SYS-BILGE-001',
    uuid: '2ab1fd9d-867f-4964-a9fb-c287a37476ec',
    name: '舱底水系统',
  },
  {
    deviceId: 'SYS-INV-2-001',
    uuid: 'e82cd01c-18ad-4da3-8769-7eceb701819d',
    name: '2#日用逆变器系统',
  },
  {
    deviceId: 'SYS-DCPD-001',
    uuid: '0061bec6-1639-4d98-9b1c-21f66fd71d04',
    name: '直流配电板系统',
  },
  {
    deviceId: 'SYS-BAT-001',
    uuid: '48b3c5dd-6142-4ac1-8242-e28eb572d119',
    name: '电池系统',
  },
  {
    deviceId: 'SYS-PROP-L-001',
    uuid: '71f28f62-cab9-4b36-82dc-e454f1e8f693',
    name: '左推进系统',
  },
  {
    deviceId: 'SYS-PROP-R-001',
    uuid: '7d608139-ae35-4f53-bdd3-c4834e27e6e2',
    name: '右推进系统',
  },
];

// 监测点定义 (从 Migration 文件复制)
const MONITORING_POINTS_DATA = [
  // 1. 电池系统 (SYS-BAT-001) - 18个
  {
    deviceId: 'SYS-BAT-001',
    points: [
      { name: '总电压', type: 'voltage', unit: 'V' },
      { name: '单体电压', type: 'voltage', unit: 'V' },
      { name: '电池温度', type: 'temperature', unit: '℃' },
      { name: '电池电流', type: 'current', unit: 'A' },
      { name: 'SOC荷电状态', type: 'level', unit: '%' },
      { name: '绝缘电阻', type: 'resistance', unit: 'kΩ' },
      { name: '环境温度', type: 'temperature', unit: '℃' },
      { name: '独立环境温度', type: 'temperature', unit: '℃' },
      { name: '单体温度', type: 'temperature', unit: '℃' },
      { name: '保护功能故障', type: 'switch', unit: null },
      { name: '温度检测故障', type: 'switch', unit: null },
      { name: '充电故障', type: 'switch', unit: null },
      { name: '电池系统故障', type: 'switch', unit: null },
      { name: '接触器故障', type: 'switch', unit: null },
      { name: 'BMS通信故障', type: 'switch', unit: null },
      { name: '能量流动状态', type: 'switch', unit: null },
      { name: 'BMS控制电源故障', type: 'switch', unit: null },
      { name: 'SOH', type: 'switch', unit: null },
    ],
  },
  // 2. 左推进系统 (SYS-PROP-L-001) - 14个
  {
    deviceId: 'SYS-PROP-L-001',
    points: [
      { name: '电机电压', type: 'voltage', unit: 'V' },
      { name: '电机转速', type: 'speed', unit: 'rpm' },
      { name: '电机频率', type: 'frequency', unit: 'Hz' },
      { name: '电机功率', type: 'power', unit: 'kW' },
      { name: '逆变器电压', type: 'voltage', unit: 'V' },
      { name: '逆变器电流', type: 'current', unit: 'A' },
      { name: '逆变器故障', type: 'switch', unit: null },
      { name: '熔断器状态', type: 'switch', unit: null },
      { name: '前轴承温度', type: 'temperature', unit: '℃' },
      { name: '后轴承温度', type: 'temperature', unit: '℃' },
      { name: '定子绕组温度', type: 'temperature', unit: '℃' },
      { name: '逆变器温度', type: 'temperature', unit: '℃' },
      { name: '电机运行状态', type: 'switch', unit: null },
      { name: '电机电流', type: 'current', unit: 'A' },
    ],
  },
  // 3. 右推进系统 (SYS-PROP-R-001) - 14个
  {
    deviceId: 'SYS-PROP-R-001',
    points: [
      { name: '电机电压', type: 'voltage', unit: 'V' },
      { name: '电机转速', type: 'speed', unit: 'rpm' },
      { name: '电机频率', type: 'frequency', unit: 'Hz' },
      { name: '电机功率', type: 'power', unit: 'kW' },
      { name: '逆变器电压', type: 'voltage', unit: 'V' },
      { name: '逆变器电流', type: 'current', unit: 'A' },
      { name: '逆变器故障', type: 'switch', unit: null },
      { name: '熔断器状态', type: 'switch', unit: null },
      { name: '前轴承温度', type: 'temperature', unit: '℃' },
      { name: '后轴承温度', type: 'temperature', unit: '℃' },
      { name: '定子绕组温度', type: 'temperature', unit: '℃' },
      { name: '逆变器温度', type: 'temperature', unit: '℃' },
      { name: '电机运行状态', type: 'switch', unit: null },
      { name: '电机电流', type: 'current', unit: 'A' },
    ],
  },
  // 4. 1#日用逆变器系统 (SYS-INV-1-001) - 9个
  {
    deviceId: 'SYS-INV-1-001',
    points: [
      { name: '输入直流电压', type: 'voltage', unit: 'V' },
      { name: '输出交流电压', type: 'voltage', unit: 'V' },
      { name: '输出交流电流', type: 'current', unit: 'A' },
      { name: '输出交流频率', type: 'frequency', unit: 'Hz' },
      { name: '逆变器过电流', type: 'current', unit: 'A' },
      { name: '过载电流', type: 'current', unit: 'A' },
      { name: '电抗器温度', type: 'temperature', unit: '℃' },
      { name: '输出功率', type: 'power', unit: 'kW' },
      { name: '隔离开关', type: 'switch', unit: null },
    ],
  },
  // 5. 2#日用逆变器系统 (SYS-INV-2-001) - 9个
  {
    deviceId: 'SYS-INV-2-001',
    points: [
      { name: '输入直流电压', type: 'voltage', unit: 'V' },
      { name: '输出交流电压', type: 'voltage', unit: 'V' },
      { name: '输出交流电流', type: 'current', unit: 'A' },
      { name: '输出交流频率', type: 'frequency', unit: 'Hz' },
      { name: '逆变器过电流', type: 'current', unit: 'A' },
      { name: '过载电流', type: 'current', unit: 'A' },
      { name: '电抗器温度', type: 'temperature', unit: '℃' },
      { name: '输出功率', type: 'power', unit: 'kW' },
      { name: '隔离开关', type: 'switch', unit: null },
    ],
  },
  // 6. 直流配电板系统 (SYS-DCPD-001) - 9个
  {
    deviceId: 'SYS-DCPD-001',
    points: [
      { name: '绝缘电阻', type: 'resistance', unit: 'kΩ' },
      { name: '直流母排电压', type: 'voltage', unit: 'V' },
      { name: '直流母排电流', type: 'current', unit: 'A' },
      { name: '直流母排功率', type: 'power', unit: 'kW' },
      { name: '冷却系统故障', type: 'switch', unit: null },
      { name: '熔断器跳闸', type: 'switch', unit: null },
      { name: '熔断器状态', type: 'switch', unit: null },
      { name: 'EMS综合故障', type: 'switch', unit: null },
      { name: '电池电量', type: 'level', unit: '%' },
    ],
  },
  // 7. 舱底水系统 (SYS-BILGE-001) - 4个
  {
    deviceId: 'SYS-BILGE-001',
    points: [
      { name: '1#集水井水位', type: 'level', unit: 'mm' },
      { name: '2#集水井水位', type: 'level', unit: 'mm' },
      { name: '3#集水井水位', type: 'level', unit: 'mm' },
      { name: '4#集水井水位', type: 'level', unit: 'mm' },
    ],
  },
  // 8. 冷却水泵系统 (SYS-COOL-001) - 5个
  {
    deviceId: 'SYS-COOL-001',
    points: [
      { name: '1#冷却水泵失电', type: 'switch', unit: null },
      { name: '1#冷却水温', type: 'temperature', unit: '℃' },
      { name: '2#冷却水泵失电', type: 'switch', unit: null },
      { name: '2#冷却水温', type: 'temperature', unit: '℃' },
      { name: '冷却水压力', type: 'pressure', unit: 'MPa' },
    ],
  },
];

// ==========================================
// 2. 状态管理 (State Management)
// ==========================================

// 用于存储每个设备每个监测点的上一次值，实现随机游走
// Map<EquipmentUUID, Map<PointName, number>>
const deviceStates = new Map<string, Map<string, number>>();

/**
 * 初始化默认值
 */
function getInitialValue(type: string, pointName: string): number {
  if (type === 'switch') return 0; // 0: 正常/关

  // 基于类型和名称猜测合理的初始值
  if (type === 'voltage') {
    if (pointName.includes('单体')) return 3.2; // 磷酸铁锂单体
    if (pointName.includes('24V')) return 24.0;
    if (pointName.includes('母排') || pointName.includes('总')) return 648.0; // 电池系统总压
    if (pointName.includes('输出')) return 220.0;
    return 380.0;
  }
  if (type === 'current') {
    if (pointName.includes('过载')) return 0;
    return 50.0;
  }
  if (type === 'temperature') return 45.0;
  if (type === 'level') {
    if (pointName.includes('SOC')) return 80.0;
    if (pointName.includes('水位')) return 100.0; // mm
    return 50.0;
  }
  if (type === 'speed') return 800.0; // rpm
  if (type === 'frequency') return 50.0;
  if (type === 'power') return 100.0;
  if (type === 'resistance') return 500.0; // kΩ
  if (type === 'pressure') return 0.3; // MPa

  return 0;
}

/**
 * 生成下一个值 (随机游走算法)
 */
function getNextValue(
  equipmentId: string,
  pointName: string,
  type: string,
): number {
  // 1. 获取或初始化状态
  if (!deviceStates.has(equipmentId)) {
    deviceStates.set(equipmentId, new Map<string, number>());
  }
  const pointStates = deviceStates.get(equipmentId)!;

  if (!pointStates.has(pointName)) {
    pointStates.set(pointName, getInitialValue(type, pointName));
  }

  const currentValue = pointStates.get(pointName)!;
  let nextValue = currentValue;

  // 2. 根据类型应用随机波动
  if (type === 'switch') {
    // 开关量：99.5% 概率保持不变，0.5% 概率翻转（模拟偶尔的故障或状态切换）
    // 为了演示，我们让它主要保持为 0 (正常)，极低概率变为 1
    if (Math.random() > 0.999) {
      nextValue = currentValue === 0 ? 1 : 0;
    } else {
      // 如果当前是 1 (故障/开启)，有 10% 概率恢复为 0
      if (currentValue === 1 && Math.random() > 0.9) {
        nextValue = 0;
      }
    }
  } else {
    // 模拟量：随机游走
    let volatility = 0.05; // 默认波动幅度 5%
    let min = -Infinity;
    let max = Infinity;

    if (type === 'voltage') {
      volatility = 0.01; // 电压比较稳
      min = 0;
    } else if (type === 'temperature') {
      volatility = 0.02; // 温度变化慢
      min = 0;
      max = 150;
    } else if (type === 'level') {
      volatility = 0.05;
      min = 0;
      max = 100; // %
      if (pointName.includes('水位')) max = 1000;
    } else if (type === 'frequency') {
      volatility = 0.005; // 频率非常稳
      min = 48;
      max = 52;
    }

    // 计算增量： -volatility ~ +volatility
    const changePercent = (Math.random() - 0.5) * 2 * volatility;
    nextValue = currentValue * (1 + changePercent);

    // 加上微小的绝对噪声，防止死锁在 0
    if (Math.abs(nextValue) < 0.001) {
      nextValue += Math.random() - 0.5;
    }

    // 限制范围
    nextValue = Math.max(min, Math.min(max, nextValue));

    // 保留2位小数
    nextValue = Math.round(nextValue * 100) / 100;
  }

  // 3. 更新状态
  pointStates.set(pointName, nextValue);
  return nextValue;
}

// ==========================================
// 3. 主逻辑 (Main Logic)
// ==========================================

async function main() {
  console.log('🚀 启动第三方监测数据模拟器...');
  console.log(`📡 API 地址: ${API_BASE_URL}`);

  // 1. 解析参数
  const args = process.argv.slice(2);
  let interval = 2000;
  let targetDevice = '';

  args.forEach((arg) => {
    if (arg.startsWith('--interval=')) {
      interval = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--device=')) {
      targetDevice = arg.split('=')[1];
    }
  });

  console.log(`⏱️  推送频率: ${interval} ms`);
  if (targetDevice) {
    console.log(`🎯 仅针对设备: ${targetDevice}`);
    const exists = EQUIPMENT_LIST.find((e) => e.deviceId === targetDevice);
    if (!exists) {
      console.error(`❌ 错误: 设备 ${targetDevice} 不在预定义的列表中。`);
      process.exit(1);
    }
  } else {
    console.log(`🎯 针对所有 8 个设备`);
  }

  // 2. 登录获取 Token
  let token = '';
  try {
    console.log(`🔐 正在登录用户 ${USERNAME}...`);
    const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: USERNAME,
      password: PASSWORD,
    });
    // 修正: 登录接口直接返回 { accessToken, ... }，而不是嵌套在 data.data 中
    token = loginRes.data.accessToken;
    console.log('✅ 登录成功！');
  } catch (error: any) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    process.exit(1);
  }

  // 3. 循环推送
  console.log('🔄 开始推送数据循环 (按 Ctrl+C 停止)...');

  /*while (true)*/ {
    const loopStart = Date.now();

    for (const equipment of EQUIPMENT_LIST) {
      // 如果指定了目标设备，跳过非目标设备
      if (targetDevice && equipment.deviceId !== targetDevice) continue;

      // 查找该设备的监测点定义
      const config = MONITORING_POINTS_DATA.find(
        (d) => d.deviceId === equipment.deviceId,
      );

      if (!config) {
        console.warn(
          `⚠️  警告: 未找到设备 ${equipment.deviceId} 的监测点配置，跳过。`,
        );
        continue;
      }

      // 生成监测数据
      const batchData = config.points.map((point) => ({
        timestamp: new Date(),
        metricType: point.type,
        monitoringPoint: point.name,
        value: getNextValue(equipment.uuid, point.name, point.type),
        unit: point.unit,
      }));

      console.log(batchData);
      // 发送数据
      try {
        await axios.post(
          `${API_BASE_URL}/api/monitoring/data/batch`,
          {
            equipmentId: equipment.uuid,
            data: batchData,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        console.log(
          `[${new Date().toLocaleTimeString()}] ✅ ${equipment.name} (${equipment.deviceId}): 成功推送 ${batchData.length} 个点的数据`,
        );
      } catch (error: any) {
        console.error(
          `[${new Date().toLocaleTimeString()}] ❌ ${equipment.name}: 推送失败 -`,
          error.response?.data?.message || error.message,
        );

        // 如果是 401，尝试重新登录（这里简单处理，直接退出，实际可加重试）
        if (error.response?.status === 401) {
          console.error('⛔ Token 过期或无效，请重启脚本。');
          process.exit(1);
        }
      }
    }

    // 计算休眠时间，确保间隔准确
    const elapsed = Date.now() - loopStart;
    const sleepTime = Math.max(0, interval - elapsed);
    if (sleepTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
}

// 启动
main().catch((err) => console.error('Unhandled Error:', err));
