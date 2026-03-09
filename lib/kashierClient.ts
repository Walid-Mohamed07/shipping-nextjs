/**
 * Kashier Payment Gateway Client
 * Handles direct API queries to Kashier for payment status verification
 */

interface KashierPaymentStatus {
  success: boolean;
  response?: {
    status: string; // SUCCESS, FAILED, PENDING, etc.
    order_id: string;
    transaction_id?: string;
    amount: number;
    currency: string;
    card_data?: {
      brand: string;
      last_four: string;
    };
    created_at: string;
    updated_at: string;
  };
  message?: string;
}

export class KashierClient {
  private baseUrl: string;
  private merchantId: string;
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.baseUrl =
      process.env.KASHIER_BASE_URL || "https://test-api.kashier.io";
    this.merchantId = process.env.KASHIER_MERCHANT_ID || "";
    this.apiKey = process.env.KASHIER_API_KEY || "";
    this.secretKey = process.env.KASHIER_SECRET_KEY || "";

    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      throw new Error("Kashier credentials not configured");
    }
  }

  /**
   * Query Kashier API directly to get the current payment status
   * This is the SOURCE OF TRUTH for payment status
   *
   * Note: kashierOrderId is the merchant's order reference (e.g., PAY-REQ-xxx)
   * We query using the order parameter since Kashier identifies payments by merchant order ID
   */
  async getPaymentStatus(
    kashierOrderId: string,
  ): Promise<KashierPaymentStatus> {
    try {
      console.log(
        "[KashierClient] Querying payment status from source:",
        kashierOrderId,
      );

      // Query payments endpoint filtered by merchant order reference
      // This is more reliable than using session ID
      const url = `${this.baseUrl}/v3/payments?order=${encodeURIComponent(kashierOrderId)}`;

      console.log("[KashierClient] Query URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.secretKey,
          "api-key": this.apiKey,
        },
      });

      console.log("[KashierClient] Response status:", response.status);

      const data = await response.json();

      console.log("[KashierClient] Response from Kashier:", {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(data).substring(0, 500), // Log first 500 chars
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
          response: data,
        };
      }

      // If Kashier returns an array of payments, take the first one
      const paymentData = Array.isArray(data) ? data[0] : data.response || data;

      if (!paymentData) {
        return {
          success: false,
          message: "No payment found for this order",
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

  /**
   * Alternative: Query via merchant ID (if Kashier supports this endpoint)
   */
  async getOrderByMerchantReference(
    merchantOrderId: string,
  ): Promise<KashierPaymentStatus> {
    try {
      console.log(
        "[KashierClient] Querying by merchant reference:",
        merchantOrderId,
      );

      const url = `${this.baseUrl}/v3/orders/${merchantOrderId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.secretKey,
          "api-key": this.apiKey,
        },
      });

      const data = await response.json();

      console.log("[KashierClient] Response from Kashier:", {
        status: response.status,
        success: data.success,
      });

      return data;
    } catch (error) {
      console.error(
        "[KashierClient] Error querying by merchant reference:",
        error,
      );
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
