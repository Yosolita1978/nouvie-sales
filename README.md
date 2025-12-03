# Nouvie Sales & Inventory System

A modern sales and inventory management platform built for Nouvie, a Colombian cleaning products company. This system replaces manual WhatsApp and spreadsheet-based workflows with an intuitive web application.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)

## Features

**Customer Management**
- Customer registry with Colombian cédula validation
- Search by name or ID number
- Customer detail pages with order history
- Quick customer creation from order flow

**Product Catalog**
- Product management with categories (Productos, Envases, Etiquetas, Merchandising)
- Real-time stock tracking with low-stock alerts
- Price management in Colombian Pesos (COP)
- Out-of-stock visual indicators

**Order Processing**
- Streamlined order creation with customer search
- Shopping cart with real-time totals
- Automatic 19% IVA tax calculation
- Multiple payment methods (Efectivo, Nequi, Banco, Link)
- Payment and shipping status tracking
- Stock deduction on payment confirmation

**Reporting & Export**
- PDF invoice generation per order
- Excel export with date range filtering
- Dashboard with daily metrics and alerts

**Mobile-First Design**
- Responsive layout for all screen sizes
- Bottom navigation for mobile users
- Touch-friendly controls

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with credentials provider
- **Styling:** Tailwind CSS
- **PDF Generation:** @react-pdf/renderer
- **Excel Export:** ExcelJS
- **Password Hashing:** bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd nouvie-sales
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Configure your `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/nouvie"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Set up the database
```bash
npx prisma generate
npx prisma db push
```

5. Seed the database (optional, loads sample data)
```bash
npm run seed
```

6. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.


## Project Structure
```
nouvie-sales/
├── app/
│   ├── (auth)/              # Login pages
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── customers/       # Customer management
│   │   ├── dashboard/       # Main dashboard
│   │   ├── orders/          # Order management
│   │   └── products/        # Product catalog
│   └── api/                 # API routes
│       ├── customers/
│       ├── dashboard/
│       ├── orders/
│       └── products/
├── components/
│   ├── customers/           # Customer components
│   ├── layout/              # Sidebar, Header
│   ├── orders/              # Order form, ProductPicker
│   ├── products/            # Product components
│   └── ui/                  # Modal, ConfirmDialog
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── utils.ts             # Utility functions
│   ├── hooks/               # Custom React hooks
│   └── pdf/                 # PDF document templates
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Database seeder
│   └── data/                # CSV/Excel source files
└── types/                   # TypeScript definitions
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers (with search) |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/[id]` | Get customer details |
| DELETE | `/api/customers/[id]` | Delete customer |
| GET | `/api/products` | List products (with filters) |
| POST | `/api/products` | Create product |
| GET | `/api/products/[id]` | Get product details |
| DELETE | `/api/products/[id]` | Delete product |
| GET | `/api/orders` | List orders (with filters) |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/[id]` | Get order details |
| PATCH | `/api/orders/[id]` | Update order status |
| DELETE | `/api/orders/[id]` | Delete order |
| GET | `/api/orders/[id]/pdf` | Download order PDF |
| GET | `/api/orders/export` | Export orders to Excel |
| GET | `/api/dashboard` | Get dashboard stats |

## Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run seed     # Seed database with sample data
```

## Database Schema

The system uses four main models:

- **User** - Admin authentication
- **Customer** - Client information with Colombian cédula
- **Product** - Product catalog with stock tracking
- **Order** / **OrderItem** - Sales records with line items

## Localization

The application is fully localized for Colombian Spanish:
- Currency formatting in COP (Colombian Pesos)
- Date formatting in es-CO locale
- 19% IVA tax calculation
- Cédula (8-10 digit) validation

## License

Private - Nouvie © 2025