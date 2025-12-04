<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md

This file provides guidance to agents when working with code in this repository.

**Note**: This project is governed by the 货船智能机舱管理系统 Constitution which defines the core principles and governance rules for all development work.

## Build and Development
- Use `npm run dev` to start the development server (Vite)
- Use `npm run build` to create production builds
- Project uses localStorage for persistence (check `localStorage.getItem('isAuthenticated')` for auth state)

## Code Style and Patterns
- Import statements grouped by type (React imports first, then component/UI imports)
- TypeScript interfaces defined with `type` keyword for page states and props
- Event handlers use `handle` prefix (e.g., `handleLogin`, `handleLogout`)
- State management with React hooks (useState, useEffect)
- Authentication state persisted in localStorage as `'true'`/'`false'` strings

## Architecture Notes
- Page-based routing system with three states: 'login', 'register', 'main'
- Main app logic in `App.tsx` with conditional rendering based on `currentPage` state
- Components located in `src/components/` directory
- UI components from Radix UI library (dropdown-menu, button, etc.)
- Uses Tailwind CSS for styling with custom slate color theme

## Component Library
- Radix UI components for accessible UI primitives
- Custom components in `src/components/ui/` with consistent API
- Icon library: Lucide React (Bell, User, LogOut icons)
- Form handling: React Hook Form with potential for Zod validation

## File Structure Conventions
- Main entry point: `src/main.tsx` (React 18 createRoot)
- App component: `src/App.tsx` (page routing logic)
- Page components: `src/components/{Name}Page.tsx` (e.g., LoginPage, MainLayout)
- UI components: `src/components/ui/{component}.tsx` (shadcn/ui pattern)
- Global styles: `src/index.css` (Tailwind imports)