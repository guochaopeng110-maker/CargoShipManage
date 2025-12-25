# Project Context

## Purpose
**Cargo Ship Smart Engine Room Management System (货船智能机舱管理系统)**
A frontend dashboard for monitoring and managing cargo ship engine room systems, including propulsion, battery storage, power distribution, and auxiliary systems. The goal is to provide real-time monitoring, alarm management, health assessment, and decision support for ship operators.

## Tech Stack
- **Language**: TypeScript
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (primary), Vanilla CSS (when needed)
- **UI Components**: Radix UI (primitives), Lucide React (icons), Sonner (toasts)
- **State Management**: Zustand (stores for monitoring, alarms, etc.)
- **Routing**: React Router DOM v7
- **Data Visualization**: Recharts (InteractiveTimeSeriesChart, etc.), Custom Gauge/Donut Charts
- **Forms**: React Hook Form

## Project Conventions

### Code Style
- **Components**: Functional components with hooks.
- **Naming**: PascalCase for components (`BatteryMonitoringPage.tsx`), camelCase for functions/vars.
- **Directory Structure**: 
  - Modular stores (`monitoring-store`, `alarm-store`).
  - Services for API interactions (`reports-service`).

### Architecture Patterns
- **Monitoring Layout**: Evolved into two main patterns:
  1. **"Three-Stage Standard Layout"** (Legacy pattern, used in some pages):
     - **Top**: Key Metrics Visualization (Gauge/Donut charts).
     - **Middle**: Unified Monitoring Chart (InteractiveTimeSeriesChart).
     - **Bottom**: Detailed Parameters Table.
  2. **"Monitoring Wall Pattern"** (Current standard for core monitoring pages):
     - **Top**: Page title, breadcrumbs, and connection status indicator.
     - **Middle**: Monitoring Wall - Responsive grid of all monitoring points with animated metric cards.
       - Uses `MonitoringWall` component for metric display.
       - Each metric card shows real-time value, icon, trend, and status.
       - Supports responsive column layouts (desktop: 2-4 columns, tablet: 2 columns, mobile: 1 column).
     - **Bottom**: Dedicated Alarm Zone - System-specific alarm feed using `DedicatedAlarmZone` component.
     - **Key Features**:
       - Real-time WebSocket data updates via `realtime-service`.
       - Icon-based visualization with animations (using `framer-motion`).
       - Glassmorphism styling with dark mode aesthetics.
       - Lifecycle management for subscriptions (subscribe on mount, unsubscribe on unmount).
- **Navigation**: Strict adherence to the defined Sidebar structure.
- **Data Flow**: Services fetch data -> Update global Zustand stores (`monitoring-store`, `alarms-store`) -> Components consume stores (Reactively).

### Testing Strategy
- **Unit/Component**: (Implied) Vitest/React Testing Library (configured in vite.config.ts usually, though not explicitly seen, assumed standard).
- **Manual**: Validation against the "Three-Stage" layout requirements.

## Domain Context
- **Systems**:
  - **Battery/Energy Storage** (SOC, Voltage, Current, Temperature) - Uses Monitoring Wall Pattern
  - **Propulsion System** (Left/Right Motors: Voltage, Current, Speed, Power, Temperatures, Inverter Status) - Uses Monitoring Wall Pattern
  - **Inverter System** (1#/2# Inverters: DC Input Voltage, AC Output Voltage, Power, Reactor Temperature) - Uses Monitoring Wall Pattern
  - **Power Distribution** (DC Distribution Panel: Voltage, Current, Power, Insulation Resistance, Battery SOC) - Uses Monitoring Wall Pattern
  - **Auxiliary Systems** (Bilge Water System, Cooling Water Pump System) - Uses Monitoring Wall Pattern
- **Key Concepts**:
  - **Live Monitoring**: Real-time data streams via WebSocket (`realtime-service`).
  - **Health Assessment**: Report generation based on historical data.
  - **Condition-Based Maintenance**: Predictive maintenance based on equipment state.
  - **Device ID Convention**: All devices follow `SYS-XXX-001` naming pattern (e.g., `SYS-BAT-001`, `SYS-PROP-L-001`).
  - **Monitoring Points**: Each device has configured monitoring points with unique IDs (e.g., `SYS-BAT-001:voltage`).

## Important Constraints
- **Design**: Must feel "Premium" and "Dynamic" (Dark mode, glassmorphism, animations).
- **Navigation**: Sidebar structure is fixed and must not be altered without approval.
- **Placeholder**: Features like "Decision Support" are currently `UnderDevelopmentPage`.

## External Dependencies
- Backend API (implied) referenced by services.
