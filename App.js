const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// 1. MIDDLEWARE (Must be BEFORE routes)
app.use(cors({ origin: "*" })); // Allow all network devices
app.use(express.json());       // Crucial: Allows Express to read the form data

const ADMIN_EMAIL = "bluestonesoftwaredeveloper@gmail.com";
const APP_PASSWORD = "lels ujhr ngmm lfcy"; 

// 2. ROUTES
app.get("/", (req, res) => {
  res.send("Server is alive!");
});

// Double check the spelling here: "/api/admissions"
app.post("/api/admissions", async (req, res) => {
  console.log("Request received at /api/admissions");
  console.log("Body:", req.body);

  const { parentName, phone, email, program, message } = req.body;

  // Simple validation check
  if (!parentName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: ADMIN_EMAIL, pass: APP_PASSWORD },
    });

    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: "New Admission Enquiry",
      text: `Name: ${parentName}, Phone: ${phone}, Program: ${program}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Nodemailer Error:", error);
    res.status(500).json({ error: "Email failed" });
  }
});

// 3. LISTEN (Must use 0.0.0.0 for network access)
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});