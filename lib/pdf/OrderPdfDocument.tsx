import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { findPromoMixByName } from '@/lib/promomix-config'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#0440a5',
    paddingBottom: 20,
  },
  headerLeft: {},
  headerRight: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0440a5',
  },
  tagline: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0440a5',
  },
  orderNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  orderDate: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0440a5',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 80,
    color: '#666',
  },
  value: {
    flex: 1,
    color: '#111',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colProduct: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colSubtotal: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalLabel: {
    flex: 1,
    color: '#666',
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0440a5',
    width: 200,
  },
  grandTotalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0440a5',
  },
  grandTotalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0440a5',
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    color: '#374151',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  promoBadge: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  promoOriginalPrice: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    width: 200,
  },
  savingsLabel: {
    flex: 1,
    color: '#16a34a',
    fontSize: 10,
  },
  savingsValue: {
    width: 100,
    textAlign: 'right',
    color: '#16a34a',
    fontSize: 10,
  },
  shippingNote: {
    marginTop: 12,
    fontSize: 9,
    color: '#92400e',
    textAlign: 'right',
  },
})

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export interface OrderPdfData {
  orderNumber: string
  orderType: string
  createdAt: Date
  subtotal: number
  tax: number
  total: number
  notes: string | null
  customer: {
    name: string
    cedula: string
    phone: string
    address: string | null
    city: string | null
  }
  items: {
    quantity: number
    unitPrice: number
    subtotal: number
    product: {
      name: string
      unit: string
    }
  }[]
}

interface OrderPdfDocumentProps {
  order: OrderPdfData
}

export function OrderPdfDocument({ order }: OrderPdfDocumentProps) {
  const isPromoMix = order.orderType === 'promomix'

  const totalSavings = isPromoMix
    ? order.items.reduce((sum, item) => {
        const promo = findPromoMixByName(item.product.name)
        if (promo) return sum + (promo.basePrice - item.unitPrice) * item.quantity
        return sum
      }, 0)
    : 0

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>NOUVIE</Text>
            <Text style={styles.tagline}>The Gift From Nature</Text>
          </View>
          <View style={styles.headerRight}>
            {isPromoMix && <Text style={styles.promoBadge}>PROMOMIX 2026</Text>}
            <Text style={styles.title}>PEDIDO</Text>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{order.customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula:</Text>
            <Text style={styles.value}>{order.customer.cedula}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{order.customer.phone || 'No registrado'}</Text>
          </View>
          {order.customer.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Dirección:</Text>
              <Text style={styles.value}>{order.customer.address}</Text>
            </View>
          )}
          {order.customer.city && (
            <View style={styles.row}>
              <Text style={styles.label}>Ciudad:</Text>
              <Text style={styles.value}>{order.customer.city}</Text>
            </View>
          )}
        </View>

        {/* Products Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRODUCTOS</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colProduct]}>Producto</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio</Text>
              <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
            </View>
            {/* Table Rows */}
            {order.items.map((item, index) => {
              const promoProduct = isPromoMix ? findPromoMixByName(item.product.name) : null
              const hasDiscount = promoProduct && promoProduct.basePrice > item.unitPrice

              return (
                <View style={styles.tableRow} key={index}>
                  <View style={styles.colProduct}>
                    <Text>{item.product.name}</Text>
                    {hasDiscount && (
                      <Text style={styles.promoOriginalPrice}>
                        (Antes: {formatCOP(promoProduct.basePrice)})
                      </Text>
                    )}
                  </View>
                  <Text style={styles.colQty}>{item.quantity} {item.product.unit}</Text>
                  <Text style={styles.colPrice}>{formatCOP(item.unitPrice)}</Text>
                  <Text style={styles.colSubtotal}>{formatCOP(item.subtotal)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCOP(order.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (19%):</Text>
            <Text style={styles.totalValue}>{formatCOP(order.tax)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCOP(order.total)}</Text>
          </View>
          {isPromoMix && totalSavings > 0 && (
            <View style={styles.savingsRow}>
              <Text style={styles.savingsLabel}>Ahorro PromoMix:</Text>
              <Text style={styles.savingsValue}>-{formatCOP(totalSavings)}</Text>
            </View>
          )}
          {isPromoMix && (
            <Text style={styles.shippingNote}>* Envío no incluido</Text>
          )}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>NOTAS:</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Nouvie • The Gift From Nature • www.nouvie.com
        </Text>
      </Page>
    </Document>
  )
}