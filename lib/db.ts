import mongoose from "mongoose";
import { NextResponse } from "next/server";

const DB_NAME = process.env.DB_NAME || "shiphub";

let cached = global.mongoose || { conn: null, promise: null };

export async function connectDB() {
  // Read MONGODB_URI here, not at module load time
  // This allows environment variables to be loaded before importing this module
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in .env or .env.local",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: DB_NAME,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("✓ MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

declare global {
  var mongoose: any;
}

export function handleError(error: any) {
  console.error("API Error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = error?.status || 500;
  
  return NextResponse.json({ error: message }, { status });
}

export default cached;
