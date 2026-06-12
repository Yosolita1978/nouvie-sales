# Guía: Clientes sin cédula y Facturación

Esta guía explica dos cosas nuevas en el sistema:

- **Punto 4** — Cómo se emite una **factura** a un cliente que **sí tiene cédula** (funciona de principio a fin).
- **Punto 5** — Cómo el sistema te **protege**: no te deja **quitar la cédula** a un cliente que ya tiene facturas.

> **La regla de oro:** *sin cédula no hay factura.*
> Puedes vender y crear pedidos a cualquier cliente (con o sin cédula). Pero la **factura** (el PDF y el número de factura) solo se puede generar si el cliente tiene **cédula registrada**.

---

## PUNTO 4 — Emitir una factura a un cliente CON cédula

**Objetivo:** mostrar que, cuando el cliente tiene cédula, la factura funciona completa: se descarga el PDF y se asigna el número de factura.

### Paso 1 — El cliente tiene cédula

En la ficha del cliente debe verse la cédula (no dice "Sin cédula"):

```
┌──────────────────────────────────────────┐
│  MARÍA GARCÍA LÓPEZ                        │
│  [ CC: 1234567890 ]   [ Activo ]          │
│  📞 300 123 4567                           │
└──────────────────────────────────────────┘
```

> Si dijera **"Sin cédula"**, primero hay que editar el cliente y agregarle la cédula (ver Paso 5 más abajo para el caso contrario).

### Paso 2 — Abre el pedido de ese cliente

Entra a **Pedidos** y abre el pedido. Como el cliente tiene cédula, el botón **PDF** aparece **activo** (azul) y la tarjeta de factura permite **Editar**:

```
┌───────────────────────────────────────────────────────────┐
│  ORD-2026-0123                                             │
│  [ Editar ]   [  PDF  ⬇  ]   ← botón AZUL, se puede tocar  │
│                                                           │
│  ┌─────────────────────┐   ┌─────────────────────────┐    │
│  │ Cliente             │   │ Número de Factura   Editar│   │
│  │ María García López  │   │ Sin asignar              │   │
│  │ 📞 300 123 4567     │   └─────────────────────────┘    │
│  └─────────────────────┘                                  │
└───────────────────────────────────────────────────────────┘
```

### Paso 3 — Asigna el número de factura

En la tarjeta **"Número de Factura"** toca **Editar**, escribe el número y toca **Guardar**:

```
┌─────────────────────────────┐
│ Número de Factura           │
│ ┌─────────────────────────┐ │
│ │ FAC-2026-001            │ │
│ └─────────────────────────┘ │
│ [ Cancelar ]   [ Guardar ]  │
└─────────────────────────────┘
```

Queda guardado:

```
┌─────────────────────────────┐
│ Número de Factura     Editar│
│ FAC-2026-001                │
└─────────────────────────────┘
```

### Paso 4 — Descarga la factura en PDF

Toca el botón **PDF**. Se descarga la factura con todos los datos del cliente (incluida la cédula) y la puedes **compartir por WhatsApp**.

✅ **Resultado:** factura emitida de principio a fin (número + PDF).

---

## PUNTO 5 — El sistema NO deja quitar la cédula si el cliente ya tiene facturas

**Objetivo:** mostrar la protección. Si un cliente ya recibió una factura, su cédula queda "amarrada" a esa factura. Por eso el sistema **no permite borrarle la cédula** después.

### Paso 1 — Toma un cliente que YA tiene facturas

Por ejemplo, el cliente del Punto 4 (María García López), que ya tiene la factura **FAC-2026-001**.

### Paso 2 — Intenta editar el cliente y borrar la cédula

Entra a editar el cliente, **borra** el contenido del campo **Cédula** y toca **Actualizar Cliente**:

```
┌─────────────────────────────┐
│ Cédula (opcional)           │
│ ┌─────────────────────────┐ │
│ │                         │ │  ← lo dejaste vacío
│ └─────────────────────────┘ │
│ Nombre Completo *           │
│ ┌─────────────────────────┐ │
│ │ MARÍA GARCÍA LÓPEZ      │ │
│ └─────────────────────────┘ │
│        [ Actualizar Cliente ]│
└─────────────────────────────┘
```

### Paso 3 — El sistema lo bloquea con un aviso rojo

No se graba. Aparece el aviso:

```
┌───────────────────────────────────────────────────────────┐
│ ⚠  No se puede quitar la cédula: el cliente ya tiene       │
│    facturas emitidas.                                      │
└───────────────────────────────────────────────────────────┘
```

🛡️ **Resultado:** la cédula **se conserva**. La factura nunca queda "huérfana" (sin cédula). El cambio no se guardó.

> Para clientes que **nunca** han recibido factura, sí se puede dejar la cédula vacía sin problema.

---

## Para entender el contraste (cliente SIN cédula)

Si abres el pedido de un cliente **sin cédula**, el sistema te lo indica y **no deja facturar**:

```
┌───────────────────────────────────────────────────────────┐
│  ORD-2026-0124                                            │
│  [ Editar ]   [  PDF  ⬇  ]   ← botón GRIS, deshabilitado  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Número de Factura                                   │ │
│  │ ⚠ No se puede generar factura: el cliente no tiene  │ │
│  │   cédula registrada.                                │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- El **pedido sí funciona** (se puede crear, marcar pago, envío, etc.).
- Solo la **factura** queda bloqueada hasta que el cliente tenga cédula.

---

## Resumen para el cliente

| Situación | ¿Se puede vender / hacer pedido? | ¿Se puede facturar? |
|---|---|---|
| Cliente **con** cédula | ✅ Sí | ✅ Sí (PDF + número de factura) |
| Cliente **sin** cédula | ✅ Sí | ❌ No (hasta agregarle la cédula) |
| Quitar la cédula a un cliente **con facturas** | — | 🛡️ Bloqueado por el sistema |

**En una frase:** ahora puedes registrar clientes rápido con solo **nombre y teléfono** para no frenar la venta informal; y la **factura** queda protegida — solo se emite con cédula, y esa cédula no se puede borrar una vez emitida.
