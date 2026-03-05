# Recommended AI Skills for this Project

To ensure optimal assistance, code quality, and alignment with the architecture of the **Odoo Portal Framework**, the following AI skills should be activated or considered in future tasks.

## 1. React Native & Mobile App Development
- **`react-native-architecture`**
  Ensures best practices for Expo (React Native) development, focusing on cross-platform compatibility, routing via Expo Router, and mobile-specific performance considerations.
- **`mobile-design`**
  Helps adhere to mobile-first UI patterns, touch interactions, and platform-specific conventions within the Expo setup.

## 2. State Management & Data Fetching
- **`react-state-management`**
  Vital for writing effective hooks combining **TanStack Query v5** (for caching server state from Odoo) and **Zustand v5** (for client state).

## 3. TypeScript & React Standards
- **`typescript-advanced-types` / `typescript-expert`**
  Crucial for maintaining strict type-safety across the complex module registry, the adaptability `FieldMap` types, and the generic data translation functions.
- **`react-patterns`**
  Enforces the project's *Screens → Hooks → Repository* design pattern, promoting clean custom hook creation and presentation-layer separation.
- **`cc-skill-frontend-patterns` / `cc-skill-coding-standards`**
  Keeps logic clean and aligned with modern React/TypeScript best practices.

## 4. Styling (NativeWind / Tailwind)
- **`tailwind-patterns` / `tailwind-design-system`**
  As the project uses **NativeWind v4** (Tailwind CSS for React Native), these skills ensure scalable, responsive class-based UI development and token management without bloating style structures.

## 5. Monorepo Architecture & Tooling
- **`monorepo-architect` / `monorepo-management`**
  Aids in navigating the **Turborepo** + **pnpm workspaces** structure, ensuring strict package boundaries (`packages/core`, `modules/attendance`), and correctly managing dependencies.

## 6. Testing
- **`testing-patterns` / `javascript-testing-patterns`**
  Ensures high-quality **Vitest** unit tests are written with proper mocking boundaries for repositories and isolated helpers.

## 7. Clean Architecture / Domain-Driven Design
- **`clean-code`**
  Reinforces the "Golden Rule": UI screens must never talk directly to Odoo API protocols.
- **`domain-driven-design` / `ddd-tactical-patterns`**
  Assists in properly mapping the raw Odoo database boundaries into strict, decoupled frontend Domain Objects.
