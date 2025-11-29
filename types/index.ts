// ============================================
// DATABASE MODEL TYPES
// These match your Prisma schema exactly
// ============================================

// User type (Admin authentication)
export interface User {
    id: string
    email: string
    password: string
    name: string
    role: string
    active: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  // Customer type (Your 614 real customers!)
  export interface Customer {
    id: string
    cedula: string          // Colombian ID
    name: string
    email: string | null
    phone: string
    address: string | null
    city: string | null
    active: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  // Product type (Your 116 real products!)
  export interface Product {
    id: string
    name: string
    type: string            // "simple" or "variable"
    category: string        // "Hogar", "Institucional", etc.
    unit: string            // "und", "ml", etc.
    price: number           // In COP (Colombian Pesos)
    stock: number
    minStock: number
    active: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  // Order type (Will create these later)
  export interface Order {
    id: string
    orderNumber: string     // e.g., "ORD-2025-0001"
    customerId: string
    orderDate: Date
    subtotal: number
    tax: number
    total: number
    paymentMethod: string   // "cash", "transfer", "card", "credit"
    paymentStatus: string   // "pending", "partial", "paid"
    paymentDate: Date | null
    shippingStatus: string  // "preparing", "shipped", "delivered"
    shippingDate: Date | null
    deliveryDate: Date | null
    invoiceNumber: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
  }
  
  // OrderItem type (Products in an order)
  export interface OrderItem {
    id: string
    orderId: string
    productId: string
    quantity: number
    unitPrice: number
    subtotal: number
    createdAt: Date
  }
  
  // ============================================
  // EXTENDED TYPES WITH RELATIONSHIPS
  // These include related data (joins)
  // ============================================
  
  // Customer with their orders
  export interface CustomerWithOrders extends Customer {
    orders: Order[]
  }
  
  // Order with customer and items
  export interface OrderWithDetails extends Order {
    customer: Customer
    items: OrderItemWithProduct[]
  }
  
  // OrderItem with product details
  export interface OrderItemWithProduct extends OrderItem {
    product: Product
  }
  
  // ============================================
  // FORM DATA TYPES
  // For creating/updating records (no id, dates)
  // ============================================
  
  // Data needed to create a new customer
  export interface CreateCustomerInput {
    cedula: string
    name: string
    email: string
    phone: string
    address: string
    city: string
  }
  
  // Data needed to create a new product
  export interface CreateProductInput {
    name: string
    type: string
    category: string
    unit: string
    price: number
    stock: number
    minStock?: number  // Optional, defaults to 10
  }
  
  // Data needed to create an order item
  export interface CreateOrderItemInput {
    productId: string
    quantity: number
    unitPrice: number
  }
  
  // Data needed to create an order
  export interface CreateOrderInput {
    customerId: string
    items: CreateOrderItemInput[]
    paymentMethod: string
    notes?: string
  }
  
  // ============================================
  // API RESPONSE TYPES
  // What your API endpoints return
  // ============================================
  
  // Standard API success response
  export interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
  }
  
  // API error response
  export interface ApiError {
    success: false
    error: string
    message: string
  }
  
  // ============================================
  // UTILITY TYPES
  // Helper types for common scenarios
  // ============================================
  
  // Stock status for products
  export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'
  
  // Payment methods
  export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'credit'
  
  // Payment status
  export type PaymentStatus = 'pending' | 'partial' | 'paid'
  
  // Shipping status
  export type ShippingStatus = 'preparing' | 'shipped' | 'delivered'
  
  // Product categories (from your real data)
  export type ProductCategory = 
    | 'Hogar' 
    | 'Institucional' 
    | 'Productos de Limpieza'
    | 'Envases y Empaques'
    | 'Merchandising'
    | 'Etiquetas'
    | 'Otros'

// ============================================
// API RESPONSE TYPES FOR CUSTOMERS
// ============================================

// What the GET /api/customers endpoint returns for each customer
export interface CustomerListItem {
    id: string
    cedula: string
    name: string
    email: string | null
    phone: string
    address: string | null
    city: string | null
    active: boolean
    createdAt: Date | string
  }
  
  // Full API response structure
  export interface CustomersApiResponse {
    success: boolean
    data: CustomerListItem[]
    count: number
  }
  
  // Error response structure
  export interface ApiErrorResponse {
    success: false
    error: string
    message?: string
    errors?: string[]
  }

// ============================================
// ORDER CREATION TYPES
// ============================================

// Item in the shopping cart (client-side)
export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

// Request body for POST /api/orders
export interface CreateOrderRequest {
  customerId: string
  items: {
    productId: string
    quantity: number
    unitPrice: number
  }[]
  paymentMethod: 'cash' | 'nequi' | 'bank' | 'link'
  notes?: string
}

// Response from POST /api/orders
export interface CreateOrderResponse {
  success: boolean
  data: Order
  message: string
}

// Response from GET /api/orders
export interface OrdersApiResponse {
  success: boolean
  data: OrderWithDetails[]
  count: number
}