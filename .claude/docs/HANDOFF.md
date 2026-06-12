# Nouvie Sales — Documentación para el Cliente

## Acceso al Sistema

**URL**: https://nouvie-sales.vercel.app
**Dashboard**: https://nouvie-sales.vercel.app/dashboard

**Credenciales**: Ver archivo privado o contactar al desarrollador

## Qué Puede Hacer

- Ver y buscar clientes
- Crear pedidos nuevos
- Cambiar estado de pago y envío
- Descargar facturas en PDF
- Exportar pedidos a Excel
- Ver estadísticas de productos y clientes más activos por mes

## Precios Actualizados (Abril 2026)

Los precios de todos los productos capilares fueron actualizados:

| Producto                       | Precio Anterior | Precio Nuevo |
|--------------------------------|-----------------|--------------|
| Shampoos                       | $49,500         | $68,000      |
| Mascarillas                    | $62,000         | $88,000      |
| Lociones/Molding               | $55,000         | $78,000      |
| Kit Suave y Liso               | $158,000        | $188,000     |
| Kit Reparación Intensa         | $158,000        | $188,000     |
| Kit Revitalizante (Hombre)     | $96,000         | $116,800     |

Todos los precios incluyen IVA. Para que se reflejen en el sistema, ejecutar:
```
cd nouvie-sales
npx tsx scripts/verify-all-prices.ts
npx tsx scripts/add-treatment-bundles.ts
npx tsx scripts/update-kit-prices-apr2026.ts
```

## Qué NO Está Incluido

- Editar productos (solo el desarrollador)
- Cambiar precios
- Agregar nuevos usuarios

## Si Algo No Funciona

1. Tomar captura de pantalla del error
2. Enviar por WhatsApp a [tu contacto]
3. Describir qué estaba haciendo cuando pasó

## PromoMix 2026

Mariana puede crear pedidos con descuento PromoMix directamente desde el sistema:

### Crear un pedido PromoMix
1. Ir a Pedidos > + Nuevo Pedido
2. Seleccionar **"PromoMix 2026"** en Tipo de Pedido
3. Solo se muestran los 13 productos elegibles con precios con descuento
4. Agregar productos hasta alcanzar el mínimo de $300.000 (la barra de progreso lo muestra)
5. Seleccionar cliente y método de pago
6. Crear pedido

### Notas importantes
- El mínimo de $300.000 es obligatorio — no se puede crear el pedido sin alcanzarlo
- Descuento Hogar: 20% | Descuento Capilar: 40%
- El envío NO está incluido en PromoMix
- Los pedidos PromoMix se identifican con una etiqueta amarilla "PROMOMIX"
- El PDF incluye precios originales, precios con descuento y el ahorro total

---

## Ver Pedidos por Mes

Desde la pantalla principal de Pedidos, hay una sección "Ver pedidos por mes" que muestra solo los meses que tienen pedidos. Al hacer clic en un mes:

1. Se abre la vista mensual con todos los pedidos de ese mes
2. Se pueden filtrar por estado de pago, estado de envio, y metodo de pago
3. Se puede buscar por numero de pedido o cliente
4. El boton "Descargar Mes" exporta los pedidos de ese mes a Excel
5. Las flechas < > permiten navegar al mes anterior o siguiente

---

## Estadísticas

En el menú lateral hay una sección **"Estadísticas"** (visible en computador y tablet). Muestra, para el mes que elijas en el menú desplegable de arriba:

1. **Productos más pedidos** — los productos con más unidades vendidas en el mes, con el dinero que generaron.
2. **Mejores clientes** — los clientes que más compraron en el mes, con su total y número de pedidos.
3. **Ventas por mes** — los ingresos de los últimos 12 meses, para ver cómo evoluciona el negocio. El mes seleccionado aparece resaltado.

Las barras de colores son proporcionales: la más larga es la de mayor valor. Si un mes no tiene pedidos, las dos primeras secciones aparecen vacías pero la gráfica de "Ventas por mes" sigue mostrando la tendencia.

> Nota: en la lista de **Clientes**, cada tarjeta ahora muestra también el **último pedido** del cliente (fecha, total y estado de pago) y cuántos pedidos tiene en total.

---

## Avisos al Guardar (Clientes y Productos) — Junio 2026

Al editar un **cliente** o un **producto**, el formulario ahora avisa claramente qué pasó:

- **Verde "Guardado ✓"**: los cambios quedaron grabados en el sistema.
- **Rojo (con borde)**: algo falló. El aviso aparece siempre a la vista (ya no queda escondido al hacer scroll).
  - Si el error fue de **conexión o del servidor**, aparece un botón **"Reintentar"** para volver a enviar sin volver a escribir.
  - Si falta un dato o está mal, el aviso indica qué campo corregir.

> Si después de editar un cliente NO ves el aviso verde "Guardado", el cambio no se grabó: revisa el aviso rojo y usa "Reintentar".

---

## Clientes sin cédula y facturas — Junio 2026

Ahora un cliente se puede crear con **solo nombre y teléfono**. La **cédula y el email son opcionales**.

- Sirve para registrar rápido a un cliente de venta informal (por WhatsApp) sin pedirle la cédula.
- Puedes registrar varios clientes sin cédula sin problema.
- Si más adelante necesitas la cédula, editas el cliente y la agregas.

**Regla importante: sin cédula no hay factura.**

- A un cliente **sin cédula** se le puede crear el pedido normal, marcar pagos, envíos, etc. — todo funciona igual.
- Pero **no se puede generar la factura**: ni el **PDF** ni el **número de factura**. En el pedido aparece el motivo: *"No se puede generar factura: el cliente no tiene cédula registrada."* y el botón **PDF** queda deshabilitado.
- Para facturar: edita el cliente, agrégale la **cédula**, y luego ya puedes descargar el PDF y asignar el número de factura.

**Protección extra**: si un cliente **ya tiene facturas** emitidas, el sistema **no te deja quitarle la cédula** (mostraría: *"No se puede quitar la cédula: el cliente ya tiene facturas emitidas."*).

---

## Tareas Comunes

### Marcar pedido como pagado
1. Abrir el pedido
2. Tocar "Estado de pago"
3. Seleccionar "Pagado"
4. El inventario se descuenta automáticamente

### Descargar factura
1. Abrir el pedido
2. Tocar botón "PDF"
3. Compartir por WhatsApp