/**
 * Kashier Payment Gateway Client
 * Handles direct API queries to Kashier for payment status verification
 *
 * Correct endpoint per Kashier docs:
 * GET /v3/payment/sessions/:sessionId/payment
 * Header: Authorization: {{secret_key}}
 *
 * Response: { message: "success", data: { sessionId, status, merchantOrderId, amount, ... } }
 * Status values: PENDING, SUCCESS, FAILED, DECLINED, etc.
 */

interface KashierSessionPayment {
  sessionId: string;
  status: string; // PENDING, SUCCESS, FAILED, etc.
  merchantOrderId: string;
  amount: string;
  currency: string;
  method?: string;
  orderId?: string;
  paymentChannel?: string;
  lastTransactionType?: string;
  issuerAuthorizationCode?: string;
  metaData?: any;
  customer?: any;
  history?: Array<{ status: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface KashierPaymentStatus {
  success: boolean;
  response?: KashierSessionPayment;
  message?: string;
}

export class KashierClient {
  private baseUrl: string;
  private secretKey: string;

  constructor() {
    this.baseUrl =
      process.env.KASHIER_BASE_URL || "https://test-api.kashier.io";
    this.secretKey = process.env.KASHIER_SECRET_KEY || "";

    if (!this.secretKey) {
      throw new Error("Kashier credentials not configured");
    }
  }

  /**
   * Query Kashier API to get the current payment status using the session ID.
   * Endpoint: GET /v3/payment/sessions/:sessionId/payment
   * This is the SOURCE OF TRUTH for payment status.
   */
  async getPaymentStatus(sessionId: string): Promise<KashierPaymentStatus> {
    try {
      console.log(
        "[KashierClient] Querying payment status for session:",
        sessionId,
      );

      const url = `${this.baseUrl}/v3/payment/sessions/${encodeURIComponent(sessionId)}/payment`;

      console.log("[KashierClient] Query URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.secretKey,
        },
      });

      console.log("[KashierClient] Response status:", response.status);

      const data = await response.json();

      console.log("[KashierClient] Response from Kashier:", {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(data).substring(0, 500),
      });

      if (!response.ok) {
        console.error("[KashierClient] Kashier API error:", {
          status: response.status,
          statusText: response.statusText,
          error: data,
        });
        return {
          success: false,
          message:
            data.message ||
            data.error ||
            `Kashier API returned ${response.status}: ${response.statusText}`,
        };
      }

      // Response format: { message: "success", data: { sessionId, status, ... } }
      const paymentData = data.data || data.response || data;

      if (!paymentData || !paymentData.status) {
        return {
          success: false,
          message: "No payment data found for this session",
        };
      }

      return {
        success: true,
        response: paymentData,
        message: "Payment status retrieved successfully",
      };
    } catch (error) {
      console.error("[KashierClient] Error querying Kashier:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Singleton instance
let kashierClient: KashierClient | null = null;

export function getKashierClient(): KashierClient {
  if (!kashierClient) {
    kashierClient = new KashierClient();
  }
  return kashierClient;
}
