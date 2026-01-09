const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise"); // Add this

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Add this above your app.post route
app.get("/", (req, res) => {
  res.send("<h1>BlueStone Backend is Running!</h1><p>MySQL + Email Services are active.</p>");
});

// --- XAMPP MYSQL CONFIG ---
const dbConfig = {
  host: "localhost",
  user: "root",      // Default XAMPP user
  password: "",      // Default XAMPP password is empty
  database: "bluestone_db" 
};

// --- DATABASE INITIALIZATION ---
async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    // Create DB if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.changeUser({ database: dbConfig.database });
    
    // Create Table if it doesn't exist
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
    console.log("✅ MySQL Database & Table Ready (XAMPP)");
    await connection.end();
  } catch (err) {
    console.error("❌ MySQL Init Error:", err.message);
  }
}
initDB();

const ADMIN_EMAIL = "bluestonesoftwaredeveloper@gmail.com";
const APP_PASSWORD = "lels ujhr ngmm lfcy";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: { user: ADMIN_EMAIL, pass: APP_PASSWORD },
  tls: { rejectUnauthorized: false }
});

app.post("/api/admissions", async (req, res) => {
  const { parentName, phone, email, program, message } = req.body;

  try {
    // 1. SAVE TO MYSQL
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "INSERT INTO admissions (parentName, phone, email, program, message) VALUES (?, ?, ?, ?, ?)",
      [parentName, phone, email, program, message]
    );
    await connection.end();
    console.log("💾 Data saved to MySQL ID:", result.insertId);

    // 2. SEND EMAILS
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: "New Admission Enquiry",
      html: `<h2>New Admission Request</h2>
             <p><b>Name:</b> ${parentName}</p>
             <p><b>Phone:</b> ${phone}</p>
             <p><b>Program:</b> ${program}</p>`
    });

    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: email,
      subject: "We Received Your Admission Request",
      html: `<p>Hello ${parentName},</p><p>Thank you for contacting us!</p>`,
    });

    res.json({ success: true, message: "Saved to DB and Email Sent" });
  } catch (error) {
    console.log("SERVER ERROR:", error);
    res.status(500).json({ error: "Operation failed" });
  }
});

app.listen(5000, "0.0.0.0", () => console.log("Server running on port 5000"));