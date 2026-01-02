const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = "bluestonesoftwaredeveloper@gmail.com";
const APP_PASSWORD = "lels ujhr ngmm lfcy"; // 16-character Gmail App Password

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: ADMIN_EMAIL,
    pass: APP_PASSWORD
  },
  requireTLS: true,
  tls: {
    rejectUnauthorized: false
  }
});



app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /api/admissions to submit form.");
});

app.post("/api/admissions", async (req, res) => {
  const { parentName, phone, email, program, message } = req.body;

  try {
    // Send to admin
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: "New Admission Enquiry",
      html: `
        <h2>New Admission Request</h2>
        <p><b>Name:</b> ${parentName}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Program:</b> ${program}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    // Send auto-reply to parent
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: email,
      subject: "We Received Your Admission Request",
      html: `<p>Hello ${parentName},</p>
             <p>Thank you for contacting us. Our team will reach you shortly!</p>`,
    });

    res.json({ success: true });
  } catch (error) {
    console.log("EMAIL ERROR:", error);
    res.status(500).json({ error: "Email sending failed" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
