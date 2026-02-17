import fs from "fs";
import path from "path";

// ⚠️ IMPORTANT: Load environment variables BEFORE importing anything else
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;

    const [key, ...valueParts] = trimmedLine.split("=");
    if (key) {
      const value = valueParts
        .join("=")
        .replace(/^["']|["']$/g, "")
        .trim();
      if (value && !process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
  console.log(`✓ Loaded environment from ${envPath}`);
  console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? "SET" : "NOT SET"}`);
}

// NOW import everything else
import { connectDB } from "./db";
import {
  User,
  Warehouse,
  Vehicle,
  VehicleRule,
  Request,
  Message,
  Company,
  Assignment,
  AuditLog,
} from "./models";

async function seedDatabase() {
  try {
    await connectDB();
    console.log("✓ Connected to MongoDB");

    // Clear existing data
    console.log("\nClearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Vehicle.deleteMany({}),
      VehicleRule.deleteMany({}),
      Request.deleteMany({}),
      Message.deleteMany({}),
      Company.deleteMany({}),
      Assignment.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log("✓ Collections cleared");

    // Read and seed users
    console.log("\nSeeding data...");
    // Read and seed users
    const usersData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "users.json"), "utf-8"),
    );
    if (usersData.users) {
      // Make usernames unique to avoid duplicate key errors
      const seenUsernames = new Set<string>();
      const uniqueUsers = usersData.users.filter((user: any) => {
        if (seenUsernames.has(user.username)) {
          return false; // Skip duplicate usernames
        }
        seenUsernames.add(user.username);
        return true;
      });

      if (uniqueUsers.length > 0) {
        await User.insertMany(uniqueUsers, { ordered: false }).catch(
          (err: any) => {
            // If there are still duplicates, skip and continue
            if (err.code !== 11000) throw err;
          },
        );
        console.log(
          `✓ Seeded ${uniqueUsers.length} users (skipped ${usersData.users.length - uniqueUsers.length} duplicates)`,
        );
      }
    }

    // Read and seed warehouses
    const warehousesData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "warehouse.json"),
        "utf-8",
      ),
    );
    const warehouses = Array.isArray(warehousesData)
      ? warehousesData
      : warehousesData.warehouses || [];
    if (warehouses.length > 0) {
      await Warehouse.insertMany(warehouses);
      console.log(`✓ Seeded ${warehouses.length} warehouses`);
    }

    // Read and seed vehicles
    const vehiclesData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "vehicles.json"),
        "utf-8",
      ),
    );
    const vehicles = vehiclesData.vehicles || [];
    if (vehicles.length > 0) {
      await Vehicle.insertMany(vehicles);
      console.log(`✓ Seeded ${vehicles.length} vehicles`);
    }

    // Read and seed vehicle rules
    const rulesData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "vehicle-rules.json"),
        "utf-8",
      ),
    );
    const rules = rulesData.rules || [];
    if (rules.length > 0) {
      await VehicleRule.insertMany(rules);
      console.log(`✓ Seeded ${rules.length} vehicle rules`);
    }

    // Read and seed requests
    const requestsData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "requests.json"),
        "utf-8",
      ),
    );
    const requests = requestsData.requests || [];
    if (requests.length > 0) {
      await Request.insertMany(requests);
      console.log(`✓ Seeded ${requests.length} requests`);
    }

    // Read and seed messages
    const messagesData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "messages.json"),
        "utf-8",
      ),
    );
    const messages = messagesData.messages || [];
    if (messages.length > 0) {
      await Message.insertMany(messages);
      console.log(`✓ Seeded ${messages.length} messages`);
    }

    // Read and seed companies
    const companiesData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "companies.json"),
        "utf-8",
      ),
    );
    const companies = companiesData.companies || [];
    if (companies.length > 0) {
      await Company.insertMany(companies);
      console.log(`✓ Seeded ${companies.length} companies`);
    }

    // Read and seed assignments
    const assignmentsData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "assignments.json"),
        "utf-8",
      ),
    );
    const assignments = assignmentsData.assignments || [];
    if (assignments.length > 0) {
      await Assignment.insertMany(assignments);
      console.log(`✓ Seeded ${assignments.length} assignments`);
    }

    // Read and seed audit logs
    const auditLogsData = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "audit-logs.json"),
        "utf-8",
      ),
    );
    const auditLogs = auditLogsData.logs || [];
    if (auditLogs.length > 0) {
      await AuditLog.insertMany(auditLogs);
      console.log(`✓ Seeded ${auditLogs.length} audit logs`);
    }

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nYou can now run: npm run dev");
    console.log(
      "Then visit: http://localhost:3000/swagger to test API endpoints\n",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
