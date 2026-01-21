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

async function getDbConnection() {
  return await mysql.createConnection(dbConfig);
}

// --- INITIALIZE DATABASE ---
async function initDB() {
  try {
    const connection = await getDbConnection();
    
    // 1. Create table if not exists
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

    // 2. Safely add new columns if they don't exist
    const [columns] = await connection.query("SHOW COLUMNS FROM admissions LIKE 'studentName'");
    if (columns.length === 0) {
      console.log("Adding new columns to admissions table...");
      await connection.query(`
        ALTER TABLE admissions 
        ADD COLUMN studentName VARCHAR(255) AFTER email,
        ADD COLUMN dob DATE AFTER studentName,
        ADD COLUMN gender VARCHAR(20) AFTER dob
      `);
      console.log("✅ Columns added successfully.");
    }

    console.log("✅ MySQL Tables Verified");
    await connection.end();
  } catch (err) {
    console.error("❌ MySQL Init Error:", err.message);
  }
}
initDB();

// --- EMAIL CONFIG ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bluestonesoftwaredeveloper@gmail.com";
const APP_PASSWORD = process.env.APP_PASSWORD || "lels ujhr ngmm lfcy";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { 
    user: ADMIN_EMAIL, 
    pass: APP_PASSWORD 
  },
  tls: {
    // This tells Nodemailer to ignore the certificate error
    rejectUnauthorized: false
  }
});

// --- ADMISSIONS ROUTE (UPDATED) ---
app.post("/api/admissions", async (req, res) => {
  try {
    const { parentName, phone, email, studentName, dob, gender, program, message } = req.body;

    const connection = await getDbConnection();
    
    // Updated SQL query to include student details
    const sql = `INSERT INTO admissions 
                 (parentName, phone, email, studentName, dob, gender, program, message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      parentName || null, 
      phone || null, 
      email || null, 
      studentName || null, 
      dob || null, 
      gender || null, 
      program || null, 
      message || null
    ];

    await connection.execute(sql, params);
    await connection.end();

    // Updated Email template to include student details
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Admission Request: ${studentName} (Parent: ${parentName})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #6c5ce7;">New Student Admission Form</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Parent Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${parentName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Student Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentName}</td></tr>
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date of Birth:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dob}</td></tr>
            <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Gender:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${gender}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Program:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${program}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Message:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${message || "N/A"}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #7f8c8d;">Submission received from BlueStone Website Admission Portal.</p>
        </div>
      `
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Admission Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- FRANCHISE ROUTE (STAYS THE SAME) ---
app.post("/api/franchise", async (req, res) => {
  try {
    const { fullName, email, phone, city, message } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ error: "Name and Phone are required." });
    }

    const connection = await getDbConnection();
    await connection.execute(
      "INSERT INTO franchise_enquiries (fullName, email, phone, city, message) VALUES (?, ?, ?, ?, ?)",
      [fullName || null, email || null, phone || null, city || null, message || null]
    );
    await connection.end();

    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Franchise Inquiry: ${fullName} (${city})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #d35400;">New Franchise Partner Inquiry</h2>
          <p><strong>Full Name:</strong> ${fullName}</p>
          <p><strong>City:</strong> ${city}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message || "N/A"}</p>
        </div>
      `
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Franchise Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));