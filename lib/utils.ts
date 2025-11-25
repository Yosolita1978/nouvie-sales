import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product, StockStatus } from "@/types"

// ============================================
// CSS CLASS UTILITIES
// ============================================

/**
 * Combine and merge Tailwind CSS classes
 * Useful for conditional styling
 * 
 * Example:
 *   cn("px-4 py-2", isActive && "bg-blue-500", "text-white")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// MONEY FORMATTING
// ============================================

/**
 * Format Colombian Pesos (COP)
 * 
 * Examples:
 *   formatCOP(45000) → "$45.000"
 *   formatCOP(1250000) → "$1.250.000"
 *   formatCOP(750) → "$750"
 */
export function formatCOP(amount: number): string {
  // Colombian peso formatting uses dots as thousand separators
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Parse COP string back to number
 * 
 * Examples:
 *   parseCOP("$45.000") → 45000
 *   parseCOP("45.000") → 45000
 *   parseCOP("45000") → 45000
 */
export function parseCOP(value: string): number {
  // Remove currency symbol, dots, and spaces
  const cleaned = value.replace(/[$\.\s]/g, '')
  return parseInt(cleaned, 10) || 0
}

// ============================================
// DATE FORMATTING
// ============================================

/**
 * Format date to Colombian locale
 * 
 * Examples:
 *   formatDate(new Date()) → "24 nov 2025"
 *   formatDate(new Date(), 'long') → "24 de noviembre de 2025"
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (format === 'long') {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  }
  
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date and time
 * 
 * Example:
 *   formatDateTime(new Date()) → "24 nov 2025, 3:45 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Get relative time (e.g., "hace 2 horas")
 * 
 * Examples:
 *   relativeTime(new Date()) → "ahora"
 *   relativeTime(yesterday) → "hace 1 día"
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'ahora'
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`
  if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} días`
  
  return formatDate(d)
}

// ============================================
// ORDER NUMBER GENERATION
// ============================================

/**
 * Generate unique order number
 * Format: ORD-YYYY-NNNN
 * 
 * Examples:
 *   generateOrderNumber(1) → "ORD-2025-0001"
 *   generateOrderNumber(42) → "ORD-2025-0042"
 *   generateOrderNumber(1500) → "ORD-2025-1500"
 */
export function generateOrderNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear()
  const paddedNumber = sequenceNumber.toString().padStart(4, '0')
  return `ORD-${year}-${paddedNumber}`
}

/**
 * Parse order number to get sequence
 * 
 * Example:
 *   parseOrderNumber("ORD-2025-0042") → 42
 */
export function parseOrderNumber(orderNumber: string): number {
  const parts = orderNumber.split('-')
  return parseInt(parts[2], 10) || 0
}

// ============================================
// STOCK STATUS UTILITIES
// ============================================

/**
 * Get stock status based on current stock vs minimum
 * 
 * Examples:
 *   getStockStatus(product with stock=50, minStock=10) → "in-stock"
 *   getStockStatus(product with stock=5, minStock=10) → "low-stock"
 *   getStockStatus(product with stock=0) → "out-of-stock"
 */
export function getStockStatus(product: Product): StockStatus {
  if (product.stock === 0) return 'out-of-stock'
  if (product.stock < product.minStock) return 'low-stock'
  return 'in-stock'
}

/**
 * Get color class for stock status
 * Returns Tailwind color classes
 */
export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'in-stock':
      return 'text-green-600 bg-green-50'
    case 'low-stock':
      return 'text-yellow-600 bg-yellow-50'
    case 'out-of-stock':
      return 'text-red-600 bg-red-50'
  }
}

/**
 * Get readable label for stock status
 */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'in-stock':
      return 'En Stock'
    case 'low-stock':
      return 'Stock Bajo'
    case 'out-of-stock':
      return 'Agotado'
  }
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate Colombian cedula (10 digits)
 */
export function isValidCedula(cedula: string): boolean {
  const cleaned = cedula.replace(/\D/g, '')
  return cleaned.length >= 8 && cleaned.length <= 10
}

/**
 * Validate Colombian phone number
 * Accepts: +57 300 123 4567, 3001234567, 300-123-4567
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 12 // 10 local or 12 with country code
}

/**
 * Format phone number for display
 * 
 * Example:
 *   formatPhone("3001234567") → "+57 300 123 4567"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `+57 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  
  return phone // Return as-is if format doesn't match
}

// ============================================
// TEXT UTILITIES
// ============================================

/**
 * Truncate text with ellipsis
 * 
 * Example:
 *   truncate("Very long product name here", 20) → "Very long product..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Capitalize first letter of each word
 * 
 * Example:
 *   capitalize("maría garcía lópez") → "María García López"
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}