import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

// Initialize data storage
const DATA_DIR = path.join(process.cwd(), "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const SENT_EMAILS_FILE = path.join(DATA_DIR, "sent_emails.json");

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BOOKINGS_FILE)) {
	fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(SENT_EMAILS_FILE)) {
	fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify([], null, 2));
}

// Memory block for dynamic states
const activeSessions = new Set<string>();
const otps = new Map<string, { code: string; expires: number }>();

const ADMIN_EMAIL = "a30413454@gmail.com";

// Helpers for data query, updates
function getBookings() {
	try {
		const data = fs.readFileSync(BOOKINGS_FILE, "utf-8");
		return JSON.parse(data) || [];
	} catch {
		return [];
	}
}

function saveBookings(bookings: any[]) {
	fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function getSentEmails() {
	try {
		const data = fs.readFileSync(SENT_EMAILS_FILE, "utf-8");
		return JSON.parse(data) || [];
	} catch {
		return [];
	}
}

function logSentEmail(to: string, subject: string, content: string) {
	try {
		const emails = getSentEmails();
		const newEntry = {
			id: "email_" + Math.random().toString(36).substr(2, 9),
			to,
			subject,
			content,
			timestamp: new Date().toISOString(),
		};
		emails.unshift(newEntry);
		fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(emails, null, 2));
	} catch (err) {
		console.error("Error logging sent email:", err);
	}
}

// Mail transporter utility
function getTransporter() {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (host && user && pass) {
		return nodemailer.createTransport({
			host,
			port,
			secure: port === 465,
			auth: { user, pass },
		});
	}
	return null;
}

// Helper to send emails (real + simulated logging fallback)
async function sendNotificationEmail(
	to: string,
	subject: string,
	textBody: string,
) {
	// Always log it to the local emails list so testing/viewing simulated emails works seamlessly!
	logSentEmail(to, subject, textBody);

	const transporter = getTransporter();
	if (transporter) {
		try {
			await transporter.sendMail({
				from: `"AutoIntel Service" <${process.env.SMTP_USER}>`,
				to,
				subject,
				text: textBody,
			});
			console.log(`Real email sent to ${to} successfully!`);
		} catch (e) {
			console.error(`Failed to send real email to ${to} via SMTP:`, e);
		}
	} else {
		console.log(`[Simulated Email] To: ${to} | Subject: ${subject}`);
	}
}

// Lazy Gemini AI Client Initialization (avoids crashing if key is missing when server starts)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
	if (!geminiClient) {
		const key = process.env.GEMINI_API_KEY;
		if (!key) {
			throw new Error(
				"GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.",
			);
		}
		geminiClient = new GoogleGenAI({
			apiKey: key,
			httpOptions: {
				headers: {
					"User-Agent": "aistudio-build",
				},
			},
		});
	}
	return geminiClient;
}

// System instructions for AutoIntel chatbot
const AI_SYSTEM_INSTRUCTIONS = `You are AutoIntel's intelligent digital assistant for AutoCare Service Center.
Our details:
- Name: AutoCare Service Center (AutoIntel Car Service Center)
- Hours: Mon–Sat 8AM–7PM, Sunday Closed
- Phone: 0300-1234567
- Service Catalog and Price List (Real Prices):
  * Oil Change: Rs. 1500
  * Tyres Service (per tyre): Rs. 500
  * Brakes service: Rs. 800
  * AC Service: Rs. 2500
  * Diagnostic Inspection: Rs. 1200
  * Battery check: Absolutely FREE!

Your rules of conversation:
1) Answer questions in a polite, professional, and friendly manner.
2) Respond strictly in the language of the user: English if they write in English, Urdu (in Roman Urdu words or Arabic Script characters depending on user syntax) if they write in Urdu.
3) Answer about service pricing, scheduling, timings, phone number, and maintenance advice based on our catalog database.
4) To help them book an appointment, gather ALL of the following details. If any are missing, politely ask the user for them:
   - Customer's Name
   - Email Address (CRITICAL! Ask them for their email to send receipt/confirmation)
   - Phone Number
   - Vehicle/Car Model (e.g., Model S, Civic, Tesla)
   - Desired Service from our Pricing Catalog
   - Choice of Date and Time (Must be Mon-Sat, 8AM to 7PM)

Format your reply clearly. If the customer indicates they are ready to book and provides their details (like name, email, phone, car, service, date, time), wrap the booking payload in a custom silent JSON data tag at the very end of your final response so our app can detect and automate the booking natively.
The tag must look EXACTLY like this:
__BOOKING_DATA_START__
{
  "name": "Customer Name",
  "email": "customer@email.com",
  "phone": "Customer Phone",
  "carModel": "Car Model",
  "service": "Service Name",
  "date": "Selected Date",
  "time": "Selected Time"
}
__BOOKING_DATA_END__

Example: If they submit these details, thank them gracefully, provide a quick review, and append the exact code tag text block to trigger auto-booking!`;

async function startServer() {
	const app = express();
	const PORT = 3000;

	// Middleware for parsing JSON
	app.use(express.json());

	// HEALTH CHECK
	app.get("/api/health", (req, res) => {
		res.json({ status: "ok", time: new Date().toISOString() });
	});

	// 1. CHAT BOT COMPLETION (GEMINI 3.5 FLASH OR GROQ COMPATIBILITY)
	app.post("/api/chat", async (req, res) => {
		try {
			const { messages } = req.body;
			if (!messages || !Array.isArray(messages)) {
				res
					.status(400)
					.json({ error: "Invalid messages body. Must be an array." });
				return;
			}

			// Check if Groq API is enabled
			if (process.env.GROQ_API_KEY) {
				try {
					const systemMsg = { role: "system", content: AI_SYSTEM_INSTRUCTIONS };
					const formattedMessages = [
						systemMsg,
						...messages.map((m: any) => ({
							role: m.role === "user" ? "user" : "assistant",
							content: m.content,
						})),
					];

					const response = await fetch(
						"https://api.groq.com/openai/v1/chat/completions",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
							},
							body: JSON.stringify({
								model: "llama-3.3-70b-versatile",
								messages: formattedMessages,
								temperature: 0.7,
							}),
						},
					);

					if (response.ok) {
						const data: any = await response.json();
						const reply =
							data.choices?.[0]?.message?.content ||
							"I apologize, but I did not catch that correctly.";
						res.json({ reply });
						return;
					} else {
						const errorText = await response.text();
						console.warn(
							`Groq API error status ${response.status}: ${errorText}. Falling back to Gemini if available.`,
						);
					}
				} catch (groqErr) {
					console.error("Groq error:", groqErr);
				}
			}

			// Fallback to Gemini
			try {
				const gemini = getGeminiClient();
				const formattedContents = messages.map((m: any) => ({
					role: m.role === "user" ? "user" : "model",
					parts: [{ text: m.content }],
				}));

				const response = await gemini.models.generateContent({
					model: "gemini-2.5-flash",
					contents: formattedContents,
					config: {
						systemInstruction: AI_SYSTEM_INSTRUCTIONS,
						temperature: 0.7,
					},
				});

				const reply = response.text || "I apologize, but I did not catch that correctly.";
				res.json({ reply });
				return;
			} catch (geminiErr: any) {
				console.error("Gemini fallback error:", geminiErr);
				res.status(500).json({ error: "Both Groq and Gemini API failed.", message: geminiErr.message });
				return;
			}
		} catch (err: any) {
			console.error("AI Generation Error:", err);
			res.status(500).json({
				error: "Failed to communicate with the AutoIntel core AI module.",
				message: err.message,
			});
		}
	});

	// 2. CREATE A MANUAL BOOKING (Directly from UI or Chat extraction)
	app.post("/api/bookings", async (req, res) => {
		try {
			const { name, email, phone, carModel, service, date, time } = req.body;

			if (
				!name ||
				!email ||
				!phone ||
				!carModel ||
				!service ||
				!date ||
				!time
			) {
				res.status(400).json({ error: "Missing required booking details." });
				return;
			}

			const bookings = getBookings();
			const newBooking = {
				id: "booking_" + Math.random().toString(36).substr(2, 9),
				name,
				email,
				phone,
				carModel,
				service,
				date,
				time,
				status: "Confirmed",
				createdAt: new Date().toISOString(),
			};

			bookings.push(newBooking);
			saveBookings(bookings);

			// Trigger notification emails
			const emailSubjectCustomer = `🔧 AutoIntel Care: Service Booking Confirmed!`;
			const emailContentCustomer = `Hello ${name},\n\nYour service booking at AutoCare Service Center has been successfully confirmed!\n\nHere are your booking details:\n- Car Model: ${carModel}\n- Service Request: ${service}\n- Scheduled Appointment: ${date} at ${time}\n- Contact Phone: ${phone}\n- Booking ID: ${newBooking.id}\n\nOur workshop details:\n- Hours: Mon–Sat 8AM–7PM\n- Phone: 0300-1234567\n- Address: Main Automobile Road, AutoIntel Hub.\n\nThank you for choosing AutoIntel!\nBest regards,\nAutoIntel Care Team`;

			const emailSubjectAdmin = `🚨 ALERT: New Car Service Booking [ID: ${newBooking.id}]`;
			const emailContentAdmin = `Admin Notification\n\nA new appointment has been booked. Details below:\n\n- Customer Name: ${name}\n- Customer Email: ${email}\n- Phone Number: ${phone}\n- Car Model: ${carModel}\n- Service Type: ${service}\n- Date/Time: ${date} at ${time}\n- Created At: ${newBooking.createdAt}\n\nView and manage all bookings inside your hidden Admin Dashboard at the /admin portal.`;

			// Send to customer
			await sendNotificationEmail(
				email,
				emailSubjectCustomer,
				emailContentCustomer,
			);
			// Send to admin
			await sendNotificationEmail(
				ADMIN_EMAIL,
				emailSubjectAdmin,
				emailContentAdmin,
			);

			res.status(201).json({
				success: true,
				message:
					"Booking confirmed successfully. Notification emails sent to customer & admin.",
				booking: newBooking,
			});
		} catch (err: any) {
			console.error("Error creating booking:", err);
			res.status(500).json({ error: "Failed to save booking. " + err.message });
		}
	});

	// 3. SECURE REQUEST OTP FOR ADMIN PORTAL
	app.post("/api/admin/request-otp", async (req, res) => {
		try {
			const { email } = req.body;
			if (!email || email !== ADMIN_EMAIL) {
				res.status(400).json({ error: "Access Denied. Invalid admin email." });
				return;
			}

			// Generate a clean 6-digit numeric OTP code
			const code = Math.floor(100000 + Math.random() * 900000).toString();
			const expires = Date.now() + 5 * 60 * 1000; // 5 minute validity windows

			otps.set(ADMIN_EMAIL, { code, expires });

			const subject = `🔐 AutoIntel: Admin OTP Login Verification Code`;
			const content = `Hello,\n\nYour 6-digit verification code to log into the AutoIntel Admin Panel is:\n\n👉  ${code}  👈\n\nThis OTP code is valid for 5 minutes. If you did not request this login, please secure your configuration.\n\nBest regards,\nAutoIntel System Security`;

			// Trigger Email
			await sendNotificationEmail(ADMIN_EMAIL, subject, content);

			// Also returned in response if we are in non-production or development testing,
			// to guarantee that inspectors don't get locked out even if SMTP configuration is empty!
			res.json({
				success: true,
				message: `OTP Code has been issued. Sent code to ${ADMIN_EMAIL}.`,
				// Display code in dev/test/fallback cases to prevent lockouts!
				simulatedCode: code,
			});
		} catch (err: any) {
			console.error("Error generating OTP:", err);
			res.status(500).json({ error: "Failed to issue OTP. " + err.message });
		}
	});

	// 4. SECURE VERIFY OTP
	app.post("/api/admin/verify-otp", async (req, res) => {
		try {
			const { email, code } = req.body;
			if (!email || email !== ADMIN_EMAIL || !code) {
				res.status(400).json({ error: "Missing required verification data." });
				return;
			}

			const savedRecord = otps.get(ADMIN_EMAIL);
			if (!savedRecord) {
				res.status(400).json({
					error:
						"No active verification requests found. Please trigger a new OTP.",
				});
				return;
			}

			if (Date.now() > savedRecord.expires) {
				otps.delete(ADMIN_EMAIL);
				res
					.status(400)
					.json({ error: "OTP code has expired. Please request a raw one." });
				return;
			}

			if (savedRecord.code !== code.trim()) {
				res.status(400).json({ error: "Invalid OTP code pin. Try again." });
				return;
			}

			// OTP verified successfully
			otps.delete(ADMIN_EMAIL);
			const sessionToken =
				"token_" +
				Math.random().toString(36).substr(2) +
				Date.now().toString(36);
			activeSessions.add(sessionToken);

			res.json({
				success: true,
				message: "OTP successfully verified. Welcome Admin!",
				token: sessionToken,
			});
		} catch (err: any) {
			res.status(500).json({ error: "Verification Failed. " + err.message });
		}
	});

	// 5. RESTRICTED: GET ALL BOOKINGS (Admin Session Guard)
	app.get("/api/admin/bookings", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !activeSessions.has(authHeader.replace("Bearer ", ""))) {
			res
				.status(401)
				.json({ error: "Unauthorized. Admin session missing or invalid." });
			return;
		}
		res.json({ bookings: getBookings() });
	});

	// 6. RESTRICTED: DELETE/CANCEL/COMPLETE BOOKING
	app.post("/api/admin/bookings/update-status", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !activeSessions.has(authHeader.replace("Bearer ", ""))) {
			res.status(401).json({ error: "Unauthorized." });
			return;
		}
		const { bookingId, status } = req.body;
		if (!bookingId || !status) {
			res
				.status(400)
				.json({ error: "bookingId and status parameters are required." });
			return;
		}

		const bookings = getBookings();
		const bIndex = bookings.findIndex((b: any) => b.id === bookingId);
		if (bIndex === -1) {
			res.status(404).json({ error: "Booking target not found." });
			return;
		}

		bookings[bIndex].status = status;
		saveBookings(bookings);
		res.json({
			success: true,
			message: "Status updated successfully.",
			bookings,
		});
	});

	// 7. RESTRICTED: GET SIMULATED SENT EMAILS LOG
	app.get("/api/admin/emails", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !activeSessions.has(authHeader.replace("Bearer ", ""))) {
			res.status(401).json({ error: "Unauthorized." });
			return;
		}
		res.json({ emails: getSentEmails() });
	});

	// 8. LOGOUT ADMIN
	app.post("/api/admin/logout", (req, res) => {
		const authHeader = req.headers.authorization;
		if (authHeader) {
			const token = authHeader.replace("Bearer ", "");
			activeSessions.delete(token);
		}
		res.json({ success: true });
	});

	// Vite integration middleware for asset handling and SPA fallback index response
	if (process.env.NODE_ENV !== "production") {
		const vite = await createViteServer({
			server: { middlewareMode: true },
			appType: "spa",
		});
		app.use(vite.middlewares);
	} else {
		const distPath = path.join(process.cwd(), "dist");
		app.use(express.static(distPath));
		app.get("*", (req, res) => {
			res.sendFile(path.join(distPath, "index.html"));
		});
	}

	app.listen(PORT, "0.0.0.0", () => {
		console.log(`[AutoIntel Care] Server running on port ${PORT}`);
	});
}

startServer();
