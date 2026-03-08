import { NextRequest, NextResponse } from "next/server";
import { connectDB, handleError } from "@/lib/db";
import { User } from "@/lib/models";
import nodemailer from "nodemailer";
import twilio from "twilio";

/**
 * @swagger
 * /api/auth/otp/send:
 *   post:
 *     summary: Send OTP for email or mobile verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, value]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, mobile]
 *               value:
 *                 type: string
 *               userId:
 *                 type: string
 *                 description: Required for existing users, optional during signup
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to send OTP
 */

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time (10 minutes)
const OTP_EXPIRY_MINUTES = 10;

// Email transporter configuration
function createEmailTransporter() {
  // Use environment variables for email configuration
  // For development, you can use services like Mailtrap, or set up Gmail
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Send OTP via Email
async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    const transporter = createEmailTransporter();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "ShipHub <noreply@shiphub.com>",
      to: email,
      subject: "ShipHub - Email Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #007bff;">${otp}</span>
          </div>
          <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">© ShipHub - Shipping Management System</p>
        </div>
      `,
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send email OTP:", error);
    return false;
  }
}

// Send OTP via SMS using Twilio
async function sendMobileOTP(mobile: string, otp: string): Promise<boolean> {
  try {
    // Check if Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[SMS OTP] Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env");
      console.log(`[SMS OTP - DEV MODE] OTP for ${mobile}: ${otp}`);
      // Return true for development so the flow continues
      // But in production, you should return false or throw error
      return true;
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);
    
    // Send SMS
    await client.messages.create({
      body: `Your ShipHub verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      from: fromNumber,
      to: mobile
    });
    
    console.log(`[SMS OTP] Successfully sent OTP to ${mobile}`);
    return true;
  } catch (error) {
    console.error("Failed to send mobile OTP:", error);
    // Log the OTP in development for testing even if SMS fails
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS OTP - FALLBACK] OTP for ${mobile}: ${otp}`);
    }
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { type, value, userId } = body;

    if (!type || !value) {
      return NextResponse.json(
        { error: "Missing required fields: type, value" },
        { status: 400 },
      );
    }

    if (!["email", "mobile"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'email' or 'mobile'" },
        { status: 400 },
      );
    }

    // Generate OTP and expiry
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // If userId is provided, update existing user's OTP
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 },
        );
      }

      // Update OTP in database
      if (type === "email") {
        user.emailOTP = { code: otp, expiresAt };
      } else {
        user.mobileOTP = { code: otp, expiresAt };
      }
      await user.save();
    }

    // Send OTP
    let sent = false;
    if (type === "email") {
      sent = await sendEmailOTP(value, otp);
    } else {
      sent = await sendMobileOTP(value, otp);
    }

    if (!sent) {
      return NextResponse.json(
        { error: `Failed to send OTP to ${type}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to ${type}`,
      expiresAt,
    }, { status: 200 });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return handleError(error);
  }
}
