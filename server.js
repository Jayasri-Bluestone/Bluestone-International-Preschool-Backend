const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// --- DATABASE CONFIG ---
const dbConfig = process.env.DATABASE_URL || {
  host: "localhost",
  user: "root",
  password: "",
  database: "bluestone_db"
};

// --- HELPER FUNCTION TO GET CONNECTION ---
// This handles the difference between a URL string and a config object
async function getDbConnection() {
  return await mysql.createConnection(dbConfig);
}

async function initDB() {
  try {
    const connection = await getDbConnection();
    
    // Auto-create DB only if using localhost (Cloud DBs usually provide the DB)
    if (!process.env.DATABASE_URL) {
        await connection.query(`CREATE DATABASE IF NOT EXISTS bluestone_db`);
        await connection.changeUser({ database: "bluestone_db" });
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parentName VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        program VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS franchise_enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullName VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        city VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ MySQL Tables Verified/Created");
    await connection.end();
  } catch (err) {
    console.error("❌ MySQL Init Error:", err.message);
  }
}
initDB();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bluestonesoftwaredeveloper@gmail.com";
const APP_PASSWORD = process.env.APP_PASSWORD || "lels ujhr ngmm lfcy";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: ADMIN_EMAIL, pass: APP_PASSWORD }
});

app.get("/", (req, res) => res.send("<h2>BlueStone Backend Live</h2>"));

// --- ADMISSIONS ROUTE ---
app.post("/api/admissions", async (req, res) => {
  try {
    const connection = await getDbConnection();
    await connection.execute(
      "INSERT INTO admissions (parentName, phone, email, program, message) VALUES (?, ?, ?, ?, ?)",
      [req.body.parentName, req.body.phone, req.body.email, req.body.program, req.body.message]
    );
    await connection.end();

    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: "New Admission Enquiry",
      html: `<p>New student request from ${req.body.parentName}</p>`
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Admission Error:", error.message); // This prints the REAL error in your console
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- FRANCHISE ROUTE ---
app.post("/api/franchise", async (req, res) => {
  try {
    console.log("📥 Incoming Data:", req.body); // Check your terminal to see this!

    // 1. Destructure
    const { fullName, email, phone, city, message } = req.body || {};

    // 2. FORCE UNDEFINED TO NULL (MySQL requirement)
    // If any variable is undefined, it becomes null
    const values = [
      fullName || null,
      email || null,
      phone || null,
      city || null,
      message || null
    ];

    // 3. Check if the critical data is missing
    if (!fullName || !phone) {
      return res.status(400).json({ error: "Full Name and Phone are required." });
    }

    const connection = await getDbConnection();
    
    // 4. Use the 'values' array which is now guaranteed safe
    await connection.execute(
      "INSERT INTO franchise_enquiries (fullName, email, phone, city, message) VALUES (?, ?, ?, ?, ?)",
      values
    );
    
    await connection.end();
    res.json({ success: true });

  } catch (error) {
    console.error("❌ SQL Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));