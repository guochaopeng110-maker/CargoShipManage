# Project Context

## Purpose
**Cargo Ship Intelligent Engine Room Management System (Frontend)**
A comprehensive dashboard and management system for monitoring cargo ship engine rooms. It provides real-time data visualization, alarm management, equipment health monitoring, and decision support for maritime engineers.

## Tech Stack
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI (Primitives), Lucide React (Icons)
- **State Management**: Zustand
- **Routing**: React Router DOM v6+
- **Data Visualization**: Recharts
- **Forms**: React Hook Form
- **Utilities**: date-fns (inferred), clsx, tailwind-merge

## Project Conventions

### Code Style
- **Formatting**: Prettier (inferred standard)
- **Linting**: ESLint
- **Naming**: PascalCase for components (`UserProfile.tsx`), camelCase for functions/hooks (`useAuth.ts`), kebab-case for files (general preference in some areas, though mixed).
- **Imports**: Absolute imports or clear relative paths.

### Architecture Patterns
- **Service Layer**: API calls are encapsulated in `src/services/` (e.g., `auth-service.ts`, `monitoring-service.ts`).
- **State Management**: Global state handled by Zustand stores in `src/stores/` (e.g., `auth-store.ts`).
- **Components**:
    - `src/components/`: Feature-specific and shared UI components.
    - `src/pages/`: (Note: Project seems to mix pages into components or use a flat structure, to be verified).
- **Types**: Centralized type definitions in `src/types/`.

### Testing Strategy
- *Pending analysis of test setup (Vitest/Jest not explicitly seen in root yet, but likely standard for Vite).*

### Git Workflow
- Standard feature branch workflow.

## Domain Context
- **Maritime Operations**: Focus on engine room machinery (Main Engine, Generators, Boilers).
- **Monitoring**: Real-time sensor data (Temperature, Pressure, RPM).
- **Alarms**: Critical alert system for safety.
- **Maintenance**: Predictive maintenance and health assessment.

## Important Constraints
- **Reliability**: System must handle potential network instability (ship-to-shore).
- **Performance**: Efficient rendering of high-frequency real-time data.

## External Dependencies
- Backend API (RESTful)
- WebSocket Server (for real-time data)
