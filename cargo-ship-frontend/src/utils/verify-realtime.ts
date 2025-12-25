import { realtimeService } from '../services/realtime-service';
import { ServerToClientEvents } from '../types/websocket';

/**
 * 扩展 Window 接口以包含调试对象
 */
declare global {
    interface Window {
        __REALTIME_DEBUG__: {
            service: typeof realtimeService;
            connect: (token?: string) => void;
            disconnect: () => void;
            subscribe: (equipmentId: string) => void;
            unsubscribe: (equipmentId: string) => void;
            help: () => void;
        };
    }
}

/**
 * 设置实时服务调试工具
 * 
 * 此函数会将实时服务的核心方法挂载到 window.__REALTIME_DEBUG__ 对象上，
 * 并自动监听所有关键事件打印详细日志，方便在浏览器控制台进行调试。
 * 
 * 使用方法 (在控制台输入):
 * window.__REALTIME_DEBUG__.help() - 查看所有可用命令
 */
export function setupRealtimeDebug() {
    if (typeof window === 'undefined') return;

    console.log(
        '%c[RealtimeDebug] 🔧 实时服务调试工具已加载',
        'background: #222; color: #bada55; font-size: 12px; padding: 4px; border-radius: 4px;'
    );
    console.log('[RealtimeDebug] 输入 window.__REALTIME_DEBUG__.help() 查看使用说明');

    // 1. 挂载全局对象
    window.__REALTIME_DEBUG__ = {
        service: realtimeService,

        /**
         * 手动连接
         * @param token 可选的认证 Token，默认使用 'debug-token'
         */
        connect: (token: string = 'debug-token') => {
            console.log(`%c[RealtimeDebug] 正在尝试连接 (Token: ${token.substring(0, 10)}...)...`, 'color: #3498db');
            realtimeService.connect(token);
        },

        /**
         * 手动断开
         */
        disconnect: () => {
            console.log('%c[RealtimeDebug]正在断开连接...', 'color: #e74c3c');
            realtimeService.disconnect();
        },

        /**
         * 订阅设备
         * @param equipmentId 设备 ID
         */
        subscribe: async (equipmentId: string) => {
            console.log(`%c[RealtimeDebug] 正在订阅设备: ${equipmentId}`, 'color: #f1c40f');
            const success = await realtimeService.subscribeToEquipment(equipmentId);
            if (success) {
                console.log(`%c[RealtimeDebug] ✅ 订阅成功: ${equipmentId}`, 'color: #2ecc71');
            } else {
                console.error(`[RealtimeDebug] ❌ 订阅失败: ${equipmentId}`);
            }
        },

        /**
         * 取消订阅设备
         * @param equipmentId 设备 ID
         */
        unsubscribe: async (equipmentId: string) => {
            console.log(`%c[RealtimeDebug] 正在取消订阅: ${equipmentId}`, 'color: #e67e22');
            await realtimeService.unsubscribeFromEquipment(equipmentId);
        },

        /**
         * 打印帮助信息
         */
        help: () => {
            console.group('🛠️ Realtime Service Debug Help');
            console.log('可用命令:');
            console.log('  connect(token?)       - 连接 WebSocket (默认 token: "debug-token")');
            console.log('  disconnect()          - 断开 WebSocket 连接');
            console.log('  subscribe(id)         - 订阅指定设备的实时数据');
            console.log('  unsubscribe(id)       - 取消订阅指定设备');
            console.log('  service               - 访问原始 realtimeService 实例');
            console.log('\n验证步骤示例:');
            console.log('  1. window.__REALTIME_DEBUG__.connect()');
            console.log('  2. 观察控制台输出 "Connected"');
            console.log('  3. window.__REALTIME_DEBUG__.subscribe("eq-001")');
            console.log('  4. 观察后端是否有 "alarm:push" 等事件推送，并检查控制台日志');
            console.groupEnd();
        }
    };

    // 2. 注入全局日志监听器 (用于验证数据接收)
    const eventTypes: (keyof ServerToClientEvents)[] = [
        'connected',
        'alarm:push',
        'alarm:batch',
        'alarm:trend',
        'monitoring:new-data',
        'equipment:health:update',
        'equipment:health:warning',
        'connect_error',
        'disconnect'
    ];

    eventTypes.forEach(event => {
        realtimeService.on(event, (data: any) => { // 使用 any 来简化 payload 类型处理
            const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

            // 根据事件类型使用不同的颜色
            let color = '#3498db'; // 默认蓝色
            if (event.includes('error') || event.includes('disconnect')) color = '#e74c3c'; // 红色
            if (event.includes('alarm')) color = '#e67e22'; // 橙色
            if (event.includes('monitoring')) color = '#2ecc71'; // 绿色

            console.groupCollapsed(`%c[RealtimeDebug] 📡 收到事件 [${event}] @ ${timestamp}`, `color: ${color}; font-weight: bold;`);
            console.log('Payload:', data);
            console.groupEnd();
        });
    });
}
