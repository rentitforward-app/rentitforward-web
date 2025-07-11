# Rent It Forward – Web App

This project is part of a multi-repository workspace for **Rent It Forward** (`RENTITFORWARD-WORKSPACE`), a peer-to-peer rental marketplace.

Workspace contains:
- `rentitforward-web/`: Next.js + Tailwind CSS web app
- `rentitforward-mobile/`: Expo + React Native mobile app
- `rentitforward-shared/`: Shared logic (types, utils, design system, API clients)

Please use shared logic from `rentitforward-shared` wherever possible.

---

## 💻 About

This is the **web app** for Rent It Forward, built with:
- **Next.js (TypeScript)**
- **Tailwind CSS**
- **Supabase** (auth, storage, Postgres)
- **Stripe Connect** (for payouts & deposits)
- **Typesense** (for lightning-fast search)

---

## 📁 Project Structure
src/
├── app/ # App routing
├── components/ # Reusable shared UI components
├── hooks/ # Custom React hooks
├── lib/ # API clients, helpers
├── middleware.ts # Route guards & session logic
├── supabase/ # Supabase client & types
├── styles/ # Tailwind styling (if separated)

---

## 🔁 Shared Modules

Imports from `../rentitforward-shared/`:
- `types/`: Shared interfaces (User, Listing, Booking)
- `utils/`: Pricing, date, formatting, Stripe helpers
- `design-system/`: Tailwind token integration (e.g. colors, spacing, typography)

## 🎨 Design System Details

Located in: `/rentitforward-shared/src/design-system/`

This directory provides a central, token-based design system for both web (Tailwind) and mobile (NativeWind) usage.

Includes:
- **Colors**: Brand palette
- **Spacing**: Margin/padding system
- **Typography**: Fonts, weights, sizes
- **Breakpoints**: Responsive design tokens
- **Tokens.ts**: Flattened export for global usage

## 🛠 Usage

In web:
import { theme } from 'rentitforward-shared/src/design-system/theme';

In mobile:
import { tokens } from 'rentitforward-shared/src/design-system/tokens';

---

## 💳 Stripe Payment Flow

- Stripe Connect is used for onboarding sharers as Express accounts
- Renter pays upfront → funds held in escrow
- Sharer receives payout after item return confirmation
- Deposit is held (if set) and refunded post-approval

## Notes
- Tailwind config pulls colors directly from shared tokens to ensure consistency across platforms.
- Design tokens must only be edited in `rentitforward-shared/src/design-system/`.
