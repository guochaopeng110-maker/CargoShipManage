/**
 * 货船智能机舱管理系统 - 实时数据模拟器 (全量数据版)
 * 
 * 职责：
 * 1. 模拟全船 8 个核心系统的全量实时监测数据。
 * 2. 支持单条推送 (monitoring:new-data) 和 批量推送 (monitoring:batch-data)。
 * 3. 自动触发告警。
 * 
 * 运行方式：
 * node scripts/realtime-simulator.js --batch
 */

const { Server } = require("socket.io");
const http = require("http");
const crypto = require("crypto");

const PORT = 3001;
const NAMESPACE = "/ws";

// ==========================================
// 8 大系统全量监测点标准定义
// ==========================================
const SYSTEM_DEFINITIONS = {
    // 1. 电池系统 (SYS-BAT-001) - 18个监测点
    "SYS-BAT-001": [
        { name: "总电压", type: "number", unit: "V", min: 600, max: 780, threshold: { high: 750, low: 620 } },
        { name: "单体电压", type: "number", unit: "V", min: 3.2, max: 4.2, threshold: { high: 4.1, low: 3.3 } },
        { name: "电池温度", type: "number", unit: "°C", min: 25, max: 55, threshold: { high: 45 } },
        { name: "电池电流", type: "number", unit: "A", min: -50, max: 200, threshold: { high: 180 } },
        { name: "SOC荷电状态", type: "number", unit: "%", min: 10, max: 100, threshold: { low: 20 } },
        { name: "绝缘电阻", type: "number", unit: "kΩ", min: 100, max: 5000, threshold: { low: 500 } },
        { name: "环境温度", type: "number", unit: "°C", min: 20, max: 40 },
        { name: "独立环境温度", type: "number", unit: "°C", min: 20, max: 40 },
        { name: "单体温度", type: "number", unit: "°C", min: 25, max: 50 },
        { name: "保护功能故障", type: "boolean", chance: 0.001 },
        { name: "温度检测故障", type: "boolean", chance: 0.001 },
        { name: "充电故障", type: "boolean", chance: 0.001 },
        { name: "电池系统故障", type: "boolean", chance: 0.001 },
        { name: "接触器故障", type: "boolean", chance: 0.001 },
        { name: "BMS通信故障", type: "boolean", chance: 0.001 },
        { name: "能量流动状态", type: "boolean", chance: 0.5 },
        { name: "BMS控制电源故障", type: "boolean", chance: 0.001 },
        { name: "SOH", type: "number", unit: "%", min: 80, max: 100 },
    ],
    // 2. 左推进系统 (SYS-PROP-L-001) - 14个监测点
    "SYS-PROP-L-001": [
        { name: "电机电压", type: "number", unit: "V", min: 600, max: 700 },
        { name: "电机转速", type: "number", unit: "rpm", min: 0, max: 1200, threshold: { high: 1100 } },
        { name: "电机频率", type: "number", unit: "Hz", min: 0, max: 60 },
        { name: "电机功率", type: "number", unit: "kW", min: 0, max: 1500, threshold: { high: 1400 } },
        { name: "逆变器电压", type: "number", unit: "V", min: 600, max: 700 },
        { name: "逆变器电流", type: "number", unit: "A", min: 0, max: 300, threshold: { high: 280 } },
        { name: "逆变器故障", type: "boolean", chance: 0.001 },
        { name: "熔断器状态", type: "boolean", val: true },
        { name: "前轴承温度", type: "number", unit: "°C", min: 30, max: 90, threshold: { high: 80 } },
        { name: "后轴承温度", type: "number", unit: "°C", min: 30, max: 90, threshold: { high: 80 } },
        { name: "定子绕组温度", type: "number", unit: "°C", min: 40, max: 120, threshold: { high: 110 } },
        { name: "逆变器温度", type: "number", unit: "°C", min: 30, max: 70, threshold: { high: 65 } },
        { name: "电机运行状态", type: "boolean", val: true },
        { name: "电机电流", type: "number", unit: "A", min: 0, max: 1200 },
    ],
    // 3. 右推进系统 (SYS-PROP-R-001) - 14个监测点
    "SYS-PROP-R-001": [
        { name: "电机电压", type: "number", unit: "V", min: 600, max: 700 },
        { name: "电机转速", type: "number", unit: "rpm", min: 0, max: 1200 },
        { name: "电机频率", type: "number", unit: "Hz", min: 0, max: 60 },
        { name: "电机功率", type: "number", unit: "kW", min: 0, max: 1500 },
        { name: "逆变器电压", type: "number", unit: "V", min: 600, max: 700 },
        { name: "逆变器电流", type: "number", unit: "A", min: 0, max: 300 },
        { name: "逆变器故障", type: "boolean", chance: 0.001 },
        { name: "熔断器状态", type: "boolean", val: true },
        { name: "前轴承温度", type: "number", unit: "°C", min: 30, max: 90 },
        { name: "后轴承温度", type: "number", unit: "°C", min: 30, max: 90 },
        { name: "定子绕组温度", type: "number", unit: "°C", min: 40, max: 120 },
        { name: "逆变器温度", type: "number", unit: "°C", min: 30, max: 70 },
        { name: "电机运行状态", type: "boolean", val: true },
        { name: "电机电流", type: "number", unit: "A", min: 0, max: 1200 },
    ],
    // 4. 1#日用逆变器 (SYS-INV-1-001) - 9个监测点
    "SYS-INV-1-001": [
        { name: "输入直流电压", type: "number", unit: "V", min: 600, max: 750 },
        { name: "输出交流电压", type: "number", unit: "V", min: 380, max: 415 },
        { name: "输出交流电流", type: "number", unit: "A", min: 0, max: 100 },
        { name: "输出交流频率", type: "number", unit: "Hz", min: 49.5, max: 50.5 },
        { name: "逆变器过电流", type: "number", unit: "A", min: 0, max: 5 },
        { name: "过载电流", type: "number", unit: "A", min: 0, max: 5 },
        { name: "电抗器温度", type: "number", unit: "°C", min: 30, max: 80 },
        { name: "输出功率", type: "number", unit: "kW", min: 0, max: 50 },
        { name: "隔离开关", type: "boolean", val: true },
    ],
    // 5. 2#日用逆变器 (SYS-INV-2-001)
    "SYS-INV-2-001": [
        { name: "输入直流电压", type: "number", unit: "V", min: 600, max: 750 },
        { name: "输出交流电压", type: "number", unit: "V", min: 380, max: 415 },
        { name: "输出交流电流", type: "number", unit: "A", min: 0, max: 100 },
        { name: "输出交流频率", type: "number", unit: "Hz", min: 49.5, max: 50.5 },
        { name: "输出功率", type: "number", unit: "kW", min: 0, max: 50 },
        { name: "隔离开关", type: "boolean", val: true },
    ],
    // 6. 直流配电板 (SYS-DCPD-001) - 9个监测点
    "SYS-DCPD-001": [
        { name: "绝缘电阻", type: "number", unit: "kΩ", min: 500, max: 5000 },
        { name: "直流母排电压", type: "number", unit: "V", min: 650, max: 780 },
        { name: "直流母排电流", type: "number", unit: "A", min: 0, max: 500 },
        { name: "直流母排功率", type: "number", unit: "kW", min: 0, max: 350 },
        { name: "冷却系统故障", type: "boolean", chance: 0.001 },
        { name: "熔断器跳闸", type: "boolean", chance: 0.001 },
        { name: "熔断器状态", type: "boolean", val: true },
        { name: "EMS综合故障", type: "boolean", chance: 0.001 },
        { name: "电池电量", type: "number", unit: "%", min: 10, max: 100 },
    ],
    // 7. 舱底水系统 (SYS-BILGE-001)
    "SYS-BILGE-001": [
        { name: "1#集水井水位", type: "number", unit: "mm", min: 0, max: 1000 },
        { name: "2#集水井水位", type: "number", unit: "mm", min: 0, max: 1000 },
        { name: "3#集水井水位", type: "number", unit: "mm", min: 0, max: 1000 },
        { name: "4#集水井水位", type: "number", unit: "mm", min: 0, max: 1000 },
    ],
    // 8. 冷却水系统 (SYS-COOL-001)
    "SYS-COOL-001": [
        { name: "1#冷却水泵失电", type: "boolean", chance: 0.001 },
        { name: "1#冷却水温", type: "number", unit: "°C", min: 20, max: 60 },
        { name: "2#冷却水泵失电", type: "boolean", chance: 0.001 },
        { name: "2#冷却水温", type: "number", unit: "°C", min: 20, max: 60 },
        { name: "冷却水压力", type: "number", unit: "MPa", min: 0.1, max: 0.8 },
    ],
};

const args = process.argv.slice(2);
const interval = parseInt(args.includes('--interval') ? args[args.indexOf('--interval') + 1] : "1000");

const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("全量数据模拟器运行中...\n");
});

const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
const ioWs = io.of(NAMESPACE);

ioWs.on("connection", (socket) => {
    socket.on("subscribe:equipment", (data, callback) => {
        const { equipmentId } = data;
        if (equipmentId) {
            socket.join(`equipment:${equipmentId}`);
            if (callback) callback({ success: true, room: `equipment:${equipmentId}` });
        }
    });

    socket.on("unsubscribe:equipment", (data, callback) => {
        const { equipmentId } = data;
        if (equipmentId) {
            socket.leave(`equipment:${equipmentId}`);
            if (callback) callback({ success: true });
        }
    });
});

/**
 * 映射设备名称
 */
function getEquipmentName(id) {
    const names = {
        "SYS-BAT-001": "电池系统",
        "SYS-PROP-L-001": "左推进电机",
        "SYS-PROP-R-001": "右推进电机",
        "SYS-INV-1-001": "1#日用逆变器",
        "SYS-INV-2-001": "2#日用逆变器",
        "SYS-DCPD-001": "直流配电板",
        "SYS-BILGE-001": "舱底水系统",
        "SYS-COOL-001": "冷却水系统"
    };
    return names[id] || id;
}

/**
 * 生成批量告警数据
 * @param {string} equipmentId 
 * @param {Array} data - 该批次中的监测点数据
 */
function generateBatchAlarms(equipmentId, data) {
    const alarms = [];
    data.forEach(item => {
        // 10% 概率产生告警 (模拟离线导入中的异常)
        if (Math.random() > 0.9) {
            const severity = Math.random() > 0.5 ? 'high' : 'medium';
            alarms.push({
                id: crypto.randomUUID(),
                equipmentId: equipmentId,
                equipmentName: getEquipmentName(equipmentId),
                severity: severity,
                severityText: severity === 'high' ? '重要' : '次要',
                metricType: item.metricType,
                abnormalValue: item.value,
                thresholdRange: "模拟阈值",
                triggeredAt: item.timestamp,
                status: "pending",
                statusText: "待处理",
                timestamp: item.timestamp,
                monitoringPoint: item.monitoringPoint,
                faultName: `${item.monitoringPoint}批量异常`,
                recommendedAction: "生成的批量异常，请检查历史数据记录。"
            });
        }
    });
    return alarms;
}

/**
 * 模拟批量数据推送
 */
function sendBatchSimulation(equipmentId, totalChunks = 5, isHistory = false) {
    const batchId = crypto.randomUUID();
    let historyAlarmsBuffer = [];

    console.log(`[批量模拟] ${isHistory ? '历史' : '实时'}开始: ${batchId.slice(0, 8)}, 共 ${totalChunks} 分片`);

    let currentChunk = 1;
    const sendNextChunk = () => {
        const points = SYSTEM_DEFINITIONS[equipmentId] || [];
        const data = points.map(config => {
            const val = config.type === "number"
                ? config.min + Math.random() * (config.max - config.min)
                : (Math.random() > (config.chance || 0.001));

            return {
                id: Math.floor(Math.random() * 1000000),
                timestamp: new Date().toISOString(),
                metricType: config.name,
                monitoringPoint: config.name,
                value: typeof val === "number" ? Number(val.toFixed(2)) : (val ? 1 : 0),
                unit: config.unit || "",
                quality: 192,
                source: isHistory ? "file-import" : "sensor-upload"
            };
        });

        // 模拟批量上报中的潜在告警
        const chunkAlarms = generateBatchAlarms(equipmentId, data);

        if (!isHistory && chunkAlarms.length > 0) {
            // 准实时流：复用 alarm:push，每收到一个分片就推一次告警
            chunkAlarms.forEach(alarm => {
                ioWs.to(`equipment:${equipmentId}`).emit("alarm:push", alarm);
            });
            console.log(`[批量告警] 实时触发 ${chunkAlarms.length} 条新告警 (alarm:push)`);
        } else if (isHistory) {
            // 离线历史流：累累积告警
            historyAlarmsBuffer.push(...chunkAlarms);
        }

        ioWs.to(`equipment:${equipmentId}`).emit("monitoring:batch-data", {
            batchId, equipmentId, data, chunkIndex: currentChunk, totalChunks, isHistory
        });

        console.log(`[分片] ${currentChunk}/${totalChunks} -> ${equipmentId}`);

        if (currentChunk < totalChunks) {
            currentChunk++;
            setTimeout(sendNextChunk, 200);
        } else {
            // 历史导入流：在最后一个分片结束后推送 alarm:batch
            if (isHistory && historyAlarmsBuffer.length > 0) {
                const batchPayload = {
                    alarms: historyAlarmsBuffer,
                    count: historyAlarmsBuffer.length
                };
                ioWs.to(`equipment:${equipmentId}`).emit("alarm:batch", batchPayload);
                console.log(`[批量告警] 历史导入完成，推送 ${historyAlarmsBuffer.length} 条合并告警 (alarm:batch)`);
            }
        }
    };
    sendNextChunk();
}

// 主单条推送循环
setInterval(() => {
    const timestamp = new Date().toISOString();
    Object.entries(SYSTEM_DEFINITIONS).forEach(([equipmentId, points]) => {
        points.forEach((config) => {
            const val = config.type === "number"
                ? config.min + Math.random() * (config.max - config.min)
                : (Math.random() > (config.chance || 0.001));

            const payload = {
                id: Math.floor(Math.random() * 1000000),
                equipmentId,
                equipmentName: getEquipmentName(equipmentId),
                timestamp,
                metricType: config.name,
                monitoringPoint: config.name,
                value: typeof val === "number" ? Number(val.toFixed(2)) : (val ? 1 : 0),
                unit: config.unit || "",
                quality: "normal",
                source: "sensor-upload"
            };
            ioWs.to(`equipment:${equipmentId}`).emit("monitoring:new-data", payload);
        });
    });
}, interval);

// 批量模拟计划
if (args.includes('--batch')) {
    console.log("[模拟器] 批量模式激活");

    // 实时批量每15秒一次
    setInterval(() => {
        const ids = Object.keys(SYSTEM_DEFINITIONS);
        sendBatchSimulation(ids[Math.floor(Math.random() * ids.length)], 3, false);
    }, 15000);

    // 历史导入每30秒一次
    setInterval(() => {
        const ids = Object.keys(SYSTEM_DEFINITIONS);
        sendBatchSimulation(ids[Math.floor(Math.random() * ids.length)], 8, true);
    }, 30000);
}

httpServer.listen(PORT, () => console.log(`[模拟器] 启动完成: http://localhost:${PORT}`));
