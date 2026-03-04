import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { amount, orderId } = await req.json();

  const response = await fetch(
    `${process.env.KASHIER_BASE_URL}/payment/session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.KASHIER_API_KEY!,
      },
      body: JSON.stringify({
        merchantId: process.env.KASHIER_MERCHANT_ID,
        amount,
        orderId,
        currency: "EGP",
        mode: "live", // or "test"
        returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-result`,
      }),
    },
  );

  const data = await response.json();

  return NextResponse.json({ url: data.redirectUrl });
}
