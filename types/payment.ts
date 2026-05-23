// Wallet Types
export interface Wallet {
  _id: string;
  user: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  totalCredits: number;
  totalDebits: number;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = "credit" | "debit" | "refund" | "payment" | "topup";
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

export interface Transaction {
  _id: string;
  user: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  request?: string;
  paymentGateway?: {
    provider: string;
    transactionId: string;
    orderId: string;
    status: string;
  };
  status: TransactionStatus;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

// Payment Types
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentMethod = "card" | "wallet" | "cash";

export interface PaymentBreakdown {
  shippingCost: number;
  serviceFee?: number;
  tax?: number;
  discount?: number;
  walletDeduction?: number;
  cardAmount?: number;
}

export interface Payment {
  _id: string;
  user: string;
  request: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  kashierOrderId?: string;
  kashierTransactionId?: string;
  kashierPaymentUrl?: string;
  kashierResponse?: Record<string, any>;
  walletTransactionId?: string;
  breakdown?: PaymentBreakdown;
  paidAt?: string;
  failedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt?: string;
}

// Checkout types
export interface CheckoutData {
  requestId: string;
  amount: number;
  walletBalance: number;
  paymentMethod: PaymentMethod;
  useWallet: boolean;
  walletAmount?: number;
  cardAmount?: number;
}

export interface KashierPaymentSession {
  merchantId: string;
  amount: number;
  orderId: string;
  currency: string;
  mode: "live" | "test";
  returnUrl: string;
  hash?: string;
}

export interface KashierWebhookPayload {
  merchantOrderId: string;
  orderId: string;
  transactionId: string;
  orderReference: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  method: string;
  createdTime: string;
  cardData?: {
    cardNumber: string;
    cardHolder: string;
    cardBrand: string;
  };
  signature: string;
}
