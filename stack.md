# Tech Stack: Mobile-First Single Page Application (Vercel + Supabase)

This stack is designed for maximum mobile performance, ease of maintenance, and automated deployments.

### Core Tech Stack (Required)


| Category | Technology | Function |
| :--- | :--- | :--- |
| Framework | **Next.js (App Router)** | SPA foundation, routing, and fast rendering. |
| Backend (DB) | **Supabase Database** | PostgreSQL relational database. |
| Backend (Auth) | **Supabase Auth** | User login and session management. |
| Backend (Realtime) | **Supabase Realtime** | WebSocket broadcast for turns, voting, and timer sync. |
| Backend (Edge) | **Supabase Edge Functions** | Server-side game logic and authoritative timer. |
| Voice Chat | **LiveKit Cloud** | Managed WebRTC server for in-game voice chat — client SDK runs on Vercel, media server hosted by LiveKit. |
| Repository | **GitHub** | Version control and source code hosting. |
| Hosting | **Vercel** | Automated deployment and global app delivery. |
| Styling | **Tailwind CSS v4** | Ultra-lightweight utility-first design system. |
| UI Foundation | **Shadcn UI** | Modular and accessible UI components. |
| Visuals | **Lucide React** | Essential minimalist icon library for UI. |
| Mobile UX | **Vaul** | Bottom sheets (Drawers) for mobile-native feel. |
| Forms | **React Hook Form** | High-performance state management and input validation. |
| Unit Testing | **Vitest + React Testing Library** | Component and logic testing in jsdom environment. |
| E2E Testing | **Playwright** | Real-world usage simulation on mobile devices. |

### Complementary Tools (Optional)


| Category | Technology | Function |
| :--- | :--- | :--- |
| Animation | **Motion (Framer)** | Smooth transitions between screens and elements. |
| Feedback | **Sonner** | Elegant and lightweight floating notifications (Toasts). |
| Visualization | **Recharts** | Data visualization and chart creation. |
| Interactivity | **Embla Carousel** | Touch-optimized sliding lists or galleries. |
| Content | **React-markdown** | Rendering of formatted text and articles. |
| Storage | **Supabase Storage** | Image and file storage (not required for MVP). |
