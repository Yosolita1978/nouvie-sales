# Nouvie — Client Context

## Contact
- **Primary**: Mariana Perilla
- **Channels**: WhatsApp (preferred), Email
- **Language**: Spanish only — all client-facing docs in español

## Business
- Colombian cleaning products company
- Sells: productos de limpieza, envases, etiquetas, merchandising
- Customers: small businesses, bulk buyers

## Technical Reality
- **Mariana's level**: Non-technical — cannot edit code, access terminal, or use dashboards
- **Device**: Mobile only — every UI decision must work on phone first
- **Budget**: Very limited — minimize external services, keep hosting costs near zero

## Projects
| Project | Purpose | Status |
|---------|---------|--------|
| nouvie-sales | Admin: customers, orders, inventory, invoices | Active |
| nouvie-web | Public product catalog | New |

## Shared Resources
- **Database**: Single Supabase/PostgreSQL instance
- **Design tokens**: Colors, fonts owned by nouvie-sales
- **Schema**: See `references/schema.md`

## Constraints to Remember
- No features that require desktop
- No paid third-party services without explicit approval
- All UI text in Spanish
- PDF invoices must be WhatsApp-shareable