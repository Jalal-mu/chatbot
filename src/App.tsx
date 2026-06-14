import React, { useState, useEffect, useRef } from "react";
import {
  Car,
  Wrench,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  Send,
  ShieldAlert,
  LogIn,
  LogOut,
  CheckCircle2,
  Mail,
  Plus,
  MapPin,
  RefreshCw,
  Eye,
  Trash2,
  Check,
  X,
  PlusCircle,
  TrendingUp
} from "lucide-react";

import { Message, Booking, SentEmail } from "./types";

export default function App() {
  // Navigation tabs: "chat" | "book" | "diagnostics" | "admin"
  const [activeTab, setActiveTab] = useState<"chat" | "book" | "diagnostics" | "admin">("chat");

  // Chatbot State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! Welcome to AutoIntel Care. I am your premium vehicle assistant. How can I assist you with your vehicle servicing, inspections, or bookings today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Manual Booking Form State
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    phone: "",
    carModel: "Tesla Model S",
    service: "Oil Change",
    date: "",
    time: "10:00 AM"
  });
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Admin Auth States
  const [adminEmail, setAdminEmail] = useState("a30413454@gmail.com");
  const [adminOtp, setAdminOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedOtpBadge, setSimulatedOtpBadge] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminError, setAdminError] = useState("");
  const [adminSuccessMsg, setAdminSuccessMsg] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin Verified Dashboard States
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [adminEmails, setAdminEmails] = useState<SentEmail[]>([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>("All");
  const [adminRefreshing, setAdminRefreshing] = useState(false);

  // Parallax background offset
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Prices Catalog
  const PRICES = [
    { name: "Oil Change", price: "Rs.1500", desc: "Premium grade synthetic lube & filter replacement" },
    { name: "Tyres Service", price: "Rs.500", desc: "Tire rotation, balancing, and pressure tuning" },
    { name: "Brakes Service", price: "Rs.800", desc: "Brake pad inspection & rotor fluid leveling" },
    { name: "AC Service", price: "Rs.2500", desc: "Gas recharge, leak test & pollen carbon filtration" },
    { name: "Inspection", price: "Rs.1200", desc: "Comprehensive 50-point engine & power diagnostics" },
    { name: "Battery check", price: "Free", desc: "Charge level analysis & terminal cleanup" }
  ];

  // Mouse Move Event listener for digital car chassis blueprint parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 60;
      const y = (e.clientY - window.innerHeight / 2) / 60;
      setMouseOffset({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Auto Scroll Chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load Admin Dashboard Content once Authenticated
  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setAdminRefreshing(true);
    try {
      // 1. Fetch Bookings
      const resB = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const dataB = await resB.json();
      if (dataB.bookings) {
        setAdminBookings(dataB.bookings);
      }

      // 2. Fetch Simulated Emails log
      const resE = await fetch("/api/admin/emails", {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const dataE = await resE.json();
      if (dataE.emails) {
        setAdminEmails(dataE.emails);
      }
    } catch (err) {
      console.error("Error refreshing admin dashboard:", err);
    } finally {
      setAdminRefreshing(false);
    }
  };

  // Helper: Trigger standard manual booking confirmation
  const handleCreateBooking = async (payload: typeof bookingForm) => {
    setIsSubmittingBooking(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookingSuccess(data.booking);
        // Clear form values
        setBookingForm({
          name: "",
          email: "",
          phone: "",
          carModel: "Tesla Model S",
          service: "Oil Change",
          date: "",
          time: "10:00 AM"
        });
      } else {
        setBookingError(data.error || "Failed to finalize booking. Please double check values.");
      }
    } catch (err: any) {
      setBookingError("Backend error: " + err.message);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Chat message submit
  const handleSendChatMessage = async (custText?: string) => {
    const textToSend = custText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!custText) setChatInput("");
    setIsTyping(true);

    try {
      // Prepare message history formatted for endpoint
      const conversationalHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationalHistory })
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const botReplyText = data.reply;
        let isCompletedBooking = false;
        let bookingData = null;

        // Parse bot response to look for automatic background booking trigger JSON tags
        if (botReplyText.includes("__BOOKING_DATA_START__")) {
          try {
            const startTag = "__BOOKING_DATA_START__";
            const endTag = "__BOOKING_DATA_END__";
            const startIndex = botReplyText.indexOf(startTag) + startTag.length;
            const endIndex = botReplyText.indexOf(endTag);
            const jsonString = botReplyText.substring(startIndex, endIndex).trim();
            const extractedBooking = JSON.parse(jsonString);

            // Trigger silent automatic booking
            bookingData = await handleSilentAutoBooking(extractedBooking);
            if (bookingData) {
              isCompletedBooking = true;
            }
          } catch (err) {
            console.error("Failed to parse back-end auto booking tag:", err);
          }
        }

        // Clean up the response display by omitting the raw data tags from human reading
        const cleanedReply = botReplyText
          .replace(/__BOOKING_DATA_START__[\s\S]*?__BOOKING_DATA_END__/g, "")
          .trim();

        setMessages(prev => [...prev, {
          id: "bot_" + Math.random().toString(36).substr(2, 9),
          role: "assistant",
          content: cleanedReply || "Your booking has been compiled successfully!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCompletedBooking,
          bookingData
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: "bot_err",
          role: "assistant",
          content: "I ran into a temporary technical block analyzing your car logs. Would you like me to book your service directly using our fast manual form?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: "bot_err_catch",
        role: "assistant",
        content: "Network issue connecting to AutoIntel central processor: " + err.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper: Silently finalize booking extracted from AI message context
  const handleSilentAutoBooking = async (payload: any) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name || "Valued Customer",
          email: payload.email || "customer@email.com",
          phone: payload.phone || "00000000",
          carModel: payload.carModel || "Model S",
          service: payload.service || "Diagnostic Inspection",
          date: payload.date || new Date().toISOString().split('T')[0],
          time: payload.time || "11:00 AM"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log("Automatic service booking is done:", data.booking);
        return data.booking;
      }
      return null;
    } catch (e) {
      console.error("Error doing silent autobooking:", e);
      return null;
    }
  };

  // Quick Action triggers
  const handleQuickAction = (action: string) => {
    let text = "";
    switch (action) {
      case "book":
        text = "I'd like to book an appointment for my car service.";
        break;
      case "prices":
        text = "Can you provide the price catalog for car repair services?";
        break;
      case "timings":
        text = "What are the active workshop operating hours and contact number?";
        break;
      case "oil":
        text = "I want to arrange an Oil Change service.";
        break;
      case "brakes":
        text = "What is the cost of brake servicing and when can I book?";
        break;
      case "ac":
        text = "My AC is blowing warm air, how much is the AC Service?";
        break;
      default:
        text = "Hello!";
    }
    handleSendChatMessage(text);
  };

  // Admin Request Login Code
  const handleRequestOtp = async () => {
    if (!adminEmail || adminEmail !== "a30413454@gmail.com") {
      setAdminError("Access Denied. Verification matches admin email only.");
      return;
    }
    setAdminError("");
    setAdminSuccessMsg("");
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setAdminSuccessMsg("✅ OTP sent successfully to your email. Please enter it below to verify.");
        if (data.simulatedCode) {
          // Store simulated pin code to showcase clearly on screen so testing works without a real server-bound SMTP!
          setSimulatedOtpBadge(data.simulatedCode);
        }
      } else {
        setAdminError(data.error || "Failed sending verification OTP code.");
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin Validate Code
  const handleVerifyOtp = async () => {
    if (!adminOtp.trim()) {
      setAdminError("Please enter the 6-digit OTP code sent.");
      return;
    }
    setAdminError("");
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, code: adminOtp })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
      } else {
        setAdminError(data.error || "Incorrect pin code. Kindly try again.");
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin Action: Change Booking status
  const handleUpdateStatus = async (bookingId: string, status: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/admin/bookings/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ bookingId, status })
      });
      const data = await res.json();
      if (res.ok) {
        fetchAdminData(); // refresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Logout
  const handleAdminLogout = async () => {
    if (adminToken) {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
    }
    setAdminToken(null);
    setOtpSent(false);
    setAdminOtp("");
    setSimulatedOtpBadge("");
    setAdminSuccessMsg("");
    setActiveTab("chat");
  };

  // Filter Bookings array
  const filteredBookings = adminBookings.filter(b => {
    if (bookingFilterStatus === "All") return true;
    return b.status === bookingFilterStatus;
  });

  return (
    <div id="main_frame" className="min-h-screen text-[#e5e5e5] pb-32 flex flex-col items-center select-none relative bg-[#0a0a0a]">

      {/* Decorative Blur Ambient Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/5 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-neutral-900/10 rounded-full blur-[130px]"></div>
      </div>

      {/* FIXED HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">AutoIntel <span className="text-red-600">Care</span></span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Workshop Status</span>
            <span className="text-xs text-green-500 font-semibold">• Open until 7:00 PM</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-[800px] mt-24 px-4 z-10 flex-1 flex flex-col justify-between">

        {/* TAB 1: CHATBOT VIEW */}
        {activeTab === "chat" && (
          <div className="flex flex-col gap-6 animate-fade-in font-sans">

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 justify-center py-2 overflow-x-auto whitespace-nowrap scrollbar-hide py-2 shrink-0">
              <button
                id="qa_book"
                onClick={() => handleQuickAction("book")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">schedule_send</span>
                Book Service
              </button>
              <button
                id="qa_prices"
                onClick={() => handleQuickAction("prices")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                See prices
              </button>
              <button
                id="qa_timings"
                onClick={() => handleQuickAction("timings")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">storefront</span>
                Timings
              </button>
              <button
                id="qa_oil"
                onClick={() => handleQuickAction("oil")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">oil_barrel</span>
                Oil change
              </button>
              <button
                id="qa_brakes"
                onClick={() => handleQuickAction("brakes")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">tire_repair</span>
                Brakes
              </button>
              <button
                id="qa_ac"
                onClick={() => handleQuickAction("ac")}
                className="px-4 py-1.5 bg-[#1a1a1a] border border-white/5 rounded-full text-xs text-[#a3a3a3] hover:text-white hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">ac_unit</span>
                AC service
              </button>
            </div>

            {/* Chat Box Streams */}
            <div className="flex flex-col gap-4 min-h-[450px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "self-end items-end flex-row-reverse" : "self-start items-start"}`}
                >
                  {m.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-red-500 font-bold">AI</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`p-4 ${m.role === "user"
                        ? "user-bubble text-white rounded-2xl rounded-tr-none shadow-lg shadow-red-950/30"
                        : "bg-[#161616] border border-white/5 text-[#e5e5e5] rounded-2xl rounded-tl-none shadow-xl"
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{m.content}</p>

                      {/* Auto-booking system badge banner */}
                      {m.isCompletedBooking && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-red-500 font-medium font-mono animate-pulse">
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                            BOOKING SUCCESSFUL: Receipts generated!
                          </div>
                          {m.bookingData && (
                            <div className="bg-[#0a0a0a] rounded p-3 text-xs border border-white/5 font-mono text-neutral-300">
                              <span className="block text-white mb-1">Booking Confirmed!</span>
                              <span className="block">ID: <span className="text-red-400">{m.bookingData.id}</span></span>
                              <span className="block">Service: {m.bookingData.service}</span>
                              <span className="block">Date: {m.bookingData.date} @ {m.bookingData.time}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 px-1 font-mono">
                      {m.role === "user" ? "You • Sent" : "AutoIntel Bot • Active"}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] self-start items-start">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-red-500 font-bold">AI</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="bg-[#161616] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 px-1 font-mono">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

          </div>
        )}

        {/* TAB 2: MANUAL BOOKING FORM SCREEN */}
        {activeTab === "book" && (
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6 animate-fade-in relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-red-600 text-3xl">calendar_month</span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Book Service Appointment</h2>
                <p className="text-xs text-neutral-400">Enter details below to notify customer and admin immediately</p>
              </div>
            </div>

            {bookingSuccess ? (
              <div className="flex flex-col items-center text-center p-6 bg-red-950/5 rounded-xl border border-red-600/20 animate-fade-in">
                <CheckCircle2 className="w-16 h-16 text-red-500 mb-4 stroke-[1.5]" />
                <h3 className="text-lg font-bold text-white">Booking Confirmed!</h3>
                <p className="text-sm text-neutral-300 mt-1 max-w-md">
                  Thank you, <strong className="text-white">{bookingSuccess.name}</strong>. Your appointment for <strong className="text-red-500">{bookingSuccess.service}</strong> has been secured!
                </p>

                <div className="w-full bg-[#0a0a0a] rounded-lg p-4 mt-6 text-left grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border border-white/5">
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Customer Name</span>
                    <span className="font-semibold text-white">{bookingSuccess.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Email Address</span>
                    <span className="font-semibold text-red-500">{bookingSuccess.email}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Scheduled Date</span>
                    <span className="font-semibold text-white">{bookingSuccess.date}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Scheduled Time</span>
                    <span className="font-semibold text-white">{bookingSuccess.time}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Vehicle Model</span>
                    <span className="font-semibold text-white">{bookingSuccess.carModel}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase text-[9px] tracking-widest font-mono">Booking Status</span>
                    <span className="text-red-500 font-mono px-1.5 py-0.5 rounded bg-red-950/20">{bookingSuccess.status}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 w-full">
                  <button
                    onClick={() => {
                      setBookingSuccess(null);
                      setActiveTab("chat");
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1a1a1a] border border-white/10 hover:border-red-650 text-sm text-[#e5e5e5] hover:bg-white/10 transition-all font-semibold font-mono cursor-pointer"
                  >
                    RETURN TO CHAT
                  </button>
                  <button
                    onClick={() => setBookingSuccess(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all text-sm font-semibold font-mono shadow-md shadow-red-950/30 cursor-pointer"
                  >
                    BOOK ANOTHER
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateBooking(bookingForm);
              }} className="flex flex-col gap-4">

                {bookingError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-lg text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none text-white placeholder:text-neutral-600 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Email Address * (Invoice Target)</label>
                    <input
                      type="email"
                      required
                      placeholder="customer@example.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none text-white placeholder:text-neutral-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Phone Connection *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0300-1234567"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none text-white placeholder:text-neutral-600 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Vehicle Model Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Tesla Model S / Honda Civic"
                      value={bookingForm.carModel}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, carModel: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none text-white placeholder:text-neutral-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Requested Service *</label>
                    <select
                      value={bookingForm.service}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, service: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-white transition-all cursor-pointer"
                    >
                      {PRICES.map((p) => (
                        <option key={p.name} value={p.name} className="bg-[#161616] text-white">
                          {p.name} ({p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Date (Mon-Sat only) *</label>
                    <input
                      type="date"
                      required
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-white transition-all cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Schedule Time Window *</label>
                    <select
                      value={bookingForm.time}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                      className="bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-white transition-all cursor-pointer"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:30 PM">06:30 PM</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white py-3.5 px-6 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all text-sm font-mono shadow-lg shadow-red-910/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingBooking ? "SECURING APPOINTMENT..." : "CONFIRM APPOINTMENT"}
                </button>

              </form>
            )}

            {/* Price list catalog shown below the form */}
            <div className="mt-6 border-t border-white/5 pt-6">
              <h4 className="text-xs uppercase tracking-widest text-red-500 font-mono font-bold mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">menu_book</span> Service Catalog & Prices
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRICES.map((p) => (
                  <div key={p.name} className="p-3 bg-[#161616] rounded-lg border border-white/5">
                    <div className="flex justify-between items-baseline gap-1">
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className="text-xs font-bold text-red-500 shrink-0">{p.price}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: VEHICLE HEALTH DIAGNOSTICS VIEW */}
        {activeTab === "diagnostics" && (
          <div className="flex flex-col gap-6 animate-fade-in">

            {/* Visual chassis blueprint display container with parallax feedback effect */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden relative min-h-[300px] flex flex-col justify-between">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02] z-10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">tire_repair</span>
                  <h3 className="font-bold text-white tracking-tight">Active Diagnostics Blueprint</h3>
                </div>
                <span className="text-xs font-mono bg-red-950/20 text-red-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Optimal</span>
              </div>

              {/* SEDAN BLUEPRINT GRAPHIC OVERVIEW */}
              <div className="relative h-[240px] flex items-center justify-center p-6 bg-[#0a0a0a]/40 overflow-hidden">
                <div
                  data-alt="chassis_blueprint"
                  style={{
                    transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
                    transition: "transform 0.1s ease-out"
                  }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 opacity-15"
                >
                  <img
                    alt="Tesla Chassis Blueprint"
                    className="w-full h-full object-contain filter invert opacity-90 scale-102"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFFctHC5gk0WFtJNsy-ZXlQXxYGIlgyuHZfGSSpfv3SRNJnB2JX9_0mfVqe90EJ4M282N9qXLf52qN-iDYqf5DX887Ww5gSwJvf5-eoeW84nvDKLvGStQmMifOXsltCEKqxtUCsCG9rIceXl1xKgQUoK0WmpuYRGZvhKvCOaP-B8nP3RUpsRG7HaciCRcrVykPlSlKnwIu6eBoTE4Q2w7LNKYv3yF_J39DBuuABZPejbDvXuklbLDUgJ_KJjgUosjFcwg9G0iA_yw"
                  />
                </div>

                {/* Tire diagnostic visual details */}
                <div className="w-full max-w-[500px] grid grid-cols-2 gap-4 relative z-10">
                  <div className="flex flex-col items-center p-3.5 rounded-xl bg-black/65 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a3a3a3] mb-1">Front Left Tire</span>
                    <span className="text-2xl font-bold tracking-tight text-white">35 <span className="text-xs text-neutral-400">PSI</span></span>
                    <div className="w-full h-1 bg-red-950/20 rounded-full mt-2.5 overflow-hidden">
                      <div className="w-[88%] h-full bg-red-600"></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center p-3.5 rounded-xl bg-black/65 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a3a3a3] mb-1">Front Right Tire</span>
                    <span className="text-2xl font-bold tracking-tight text-white">36 <span className="text-xs text-neutral-400">PSI</span></span>
                    <div className="w-full h-1 bg-red-950/20 rounded-full mt-2.5 overflow-hidden">
                      <div className="w-[90%] h-full bg-red-600"></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center p-3.5 rounded-xl bg-black/65 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a3a3a3] mb-1">Rear Left Tire</span>
                    <span className="text-2xl font-bold tracking-tight text-white">35 <span className="text-xs text-neutral-400">PSI</span></span>
                    <div className="w-full h-1 bg-red-950/20 rounded-full mt-2.5 overflow-hidden">
                      <div className="w-[88%] h-full bg-red-600"></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center p-3.5 rounded-xl bg-black/65 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a3a3a3] mb-1">Rear Right Tire</span>
                    <span className="text-2xl font-bold tracking-tight text-white">34 <span className="text-xs text-neutral-400">PSI</span></span>
                    <div className="w-full h-1 bg-red-950/20 rounded-full mt-2.5 overflow-hidden">
                      <div className="w-[85%] h-full bg-red-600"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/[0.01] border-t border-white/5 text-center z-10">
                <p className="text-xs text-neutral-400 italic">Tire pressures are synced automatically with Tesla CAN-BUS telematics.</p>
              </div>
            </div>

            {/* General Vehicle Telemetry */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">BATTERY RANGE</span>
                <span className="text-xl font-bold text-white">384 KM</span>
                <span className="text-[10px] text-red-500 font-medium font-mono">84% Capacity</span>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">BRAKE Pad WEAR</span>
                <span className="text-xl font-bold text-white">Optimal</span>
                <span className="text-[10px] text-red-500 font-medium font-mono">15% Wear Ratio</span>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">OIL LIFE INDEX</span>
                <span className="text-xl font-bold text-white">92%</span>
                <span className="text-[10px] text-emerald-400 font-medium font-mono">Synthetic (Clean)</span>
              </div>
              <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">DIAGNOSTIC STATUS</span>
                <span className="text-xl font-bold text-red-500">HEALTHY</span>
                <span className="text-[10px] text-neutral-500 font-mono">0 Fault Logs</span>
              </div>
            </div>

            {/* Quick Contact Workshop Alert Panel */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 border-l-4 border-l-red-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1">
                  <Wrench className="w-4 h-4 text-red-500" /> AutoIntel Professional Workshop Care
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-lg">
                  Need custom work, diagnostics testing, or scheduled servicing? Call us directly, or schedule a booking right away inside our dashboard form.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <a
                  href="tel:03001234567"
                  className="flex-1 md:flex-none text-center bg-[#1a1a1a] text-neutral-300 border border-white/10 py-2.5 px-4 rounded-xl text-xs font-bold font-mono hover:bg-neutral-800 hover:text-red-500 transition-all text-nowrap cursor-pointer"
                >
                  CALL : 0300-1234567
                </a>
                <button
                  onClick={() => setActiveTab("book")}
                  className="flex-1 md:flex-none bg-red-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold font-mono hover:scale-103 hover:bg-red-700 transition-all text-nowrap cursor-pointer"
                >
                  BOOK WORKSHOP
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SECURED ADMIN PANEL & PORTALS */}
        {activeTab === "admin" && (
          <div className="flex flex-col gap-6 animate-fade-in text-left">
            {!adminToken ? (
              // ADMIN LOGIN SCREEN (GUARDS DASHBOARD PATH)
              <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 max-w-md mx-auto w-full flex flex-col gap-5 shadow-2xl">
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-red-950/20 flex items-center justify-center mb-3">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">AutoIntel Admin Verification</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">OTP validation will be generated to secure dashboard data</p>
                </div>

                {adminError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-3 rounded-lg text-xs">
                    {adminError}
                  </div>
                )}
                {adminSuccessMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 p-3 rounded-lg text-xs">
                    {adminSuccessMsg}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">Admin Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        disabled={otpSent}
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-600 outline-none text-white font-mono placeholder:text-neutral-600 disabled:opacity-70"
                        placeholder="admin@autointel.services"
                      />
                      <span className="absolute right-4 top-3.5 material-symbols-outlined text-neutral-500 text-sm">alternate_email</span>
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      onClick={handleRequestOtp}
                      disabled={adminLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-xl text-xs font-bold font-mono hover:scale-[1.02] active:scale-95 transition-all text-center disabled:opacity-50 cursor-pointer"
                    >
                      {adminLoading ? "GENERATING OTP SECURITY TOKEN..." : "REQUEST OTP VERIFICATION"}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <div className="flex flex-col gap-1 bg-[#161616] p-3 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] uppercase tracking-wider text-red-500 font-mono font-bold">Verification PIN Code</label>
                          <button
                            onClick={() => { setOtpSent(false); setAdminOtp(""); setSimulatedOtpBadge(""); setAdminSuccessMsg(""); }}
                            className="text-[9px] font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            Change Email
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={adminOtp}
                          onChange={(e) => setAdminOtp(e.target.value)}
                          className="w-full text-center bg-[#0a0a0a] border border-white/10 rounded-xl py-3 text-lg font-bold outline-none text-white tracking-[0.4em] placeholder:tracking-normal placeholder:text-xs placeholder:text-neutral-600 transition-all font-mono"
                        />
                      </div>

                      {/* SIMULATED OTP CODE WIDGET / LEGENDARY TESTING UX */}


                      <button
                        onClick={handleVerifyOtp}
                        disabled={adminLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-5 rounded-xl text-xs font-bold font-mono hover:scale-[1.02] active:scale-95 transition-all text-center disabled:opacity-50 cursor-pointer"
                      >
                        {adminLoading ? "VERIFYING OTP..." : "VERIFY CODE & ACCESS"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // AUTHORIZED ADMIN PANEL CONTAINER VIEW
              <div className="flex flex-col gap-6 animate-fade-in">

                {/* Admin Toolbar Dashboard Header */}
                <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-950/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-500">admin_panel_settings</span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">AutoIntel Central Portal</h2>
                      <p className="text-xs text-neutral-400">Logged in as: <strong className="text-white font-mono">{adminEmail}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <button
                      onClick={fetchAdminData}
                      disabled={adminRefreshing}
                      className="flex-1 md:flex-none bg-[#1a1a1a] border border-white/5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-neutral-300 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${adminRefreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                    <button
                      onClick={handleAdminLogout}
                      className="flex-1 md:flex-none bg-red-500/10 border border-red-500/20 text-red-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">Total Bookings</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{adminBookings.length}</span>
                  </div>
                  <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">Pending / Confirmed</span>
                    <span className="text-2xl font-bold tracking-tight text-red-500">{adminBookings.filter(b => b.status === "Confirmed" || b.status === "Pending").length}</span>
                  </div>
                  <div className="bg-[#121212] border border-white/5 p-4 rounded-xl flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">Emails Dispatched</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{adminEmails.length}</span>
                  </div>
                </div>

                {/* Main Content Splitted grids: Bookings on left, Sent Email Logs on right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* LEFT RAIL: BOOKING REGISTERS (7 cols) */}
                  <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">

                      {/* Filter header toolbars */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-red-500" /> Maintenance Appointments
                        </h3>

                        {/* Selector drop buttons */}
                        <div className="flex gap-1.5">
                          {["All", "Confirmed", "Completed", "Cancelled"].map((st) => (
                            <button
                              key={st}
                              onClick={() => setBookingFilterStatus(st)}
                              className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${bookingFilterStatus === st
                                ? "bg-red-650 text-white font-bold"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10"
                                }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bookings array loop */}
                      <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto scrollbar-hide">
                        {filteredBookings.length === 0 ? (
                          <div className="py-12 text-center text-xs text-neutral-500 italic">
                            No service bookings found matching filter: {bookingFilterStatus}
                          </div>
                        ) : (
                          filteredBookings.map((b) => (
                            <div key={b.id} className="p-4 bg-[#161616] rounded-xl border border-white/5 flex flex-col gap-3 hover:border-white/10 transition-all">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                    {b.name}
                                    <span className="font-mono text-[9px] uppercase bg-white/5 text-neutral-450 px-1.5 py-0.5 rounded font-normal">
                                      {b.carModel}
                                    </span>
                                  </h4>
                                  <a href={`mailto:${b.email}`} className="text-xs text-red-500 hover:underline font-mono">{b.email}</a>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${b.status === "Completed"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                                    : b.status === "Cancelled"
                                      ? "bg-red-500/20 text-red-300 border border-red-500/20"
                                      : "bg-red-950/20 text-red-500 border border-red-900/30"
                                    }`}>
                                    {b.status}
                                  </span>
                                  <span className="text-[9px] text-neutral-500 font-mono">
                                    ID: {b.id}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-black/25 rounded-lg p-3 border border-white/5">
                                <div>
                                  <span className="text-neutral-500 block uppercase text-[8px] tracking-wider font-mono">Requested Service</span>
                                  <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                                    <Wrench className="w-3.5 h-3.5 text-red-500" />
                                    {b.service}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block uppercase text-[8px] tracking-wider font-mono">Date and Time</span>
                                  <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                                    {b.date} • {b.time}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block uppercase text-[8px] tracking-wider font-mono">Phone Connection</span>
                                  <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3.5 h-3.5 text-red-500" />
                                    <a href={`tel:${b.phone}`} className="hover:underline">{b.phone}</a>
                                  </span>
                                </div>
                              </div>

                              {/* Status control action buttons */}
                              <div className="flex gap-2 justify-end pt-1">
                                {b.status !== "Completed" && b.status !== "Cancelled" && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, "Completed")}
                                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Complete
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, "Cancelled")}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" /> Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>

                  {/* RIGHT RAIL: EMAIL DISPATCH SIMULATION LOGS FEED (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 min-h-[500px]">
                      <div className="border-b border-white/5 pb-2">
                        <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-red-500" /> Simulated Mail Outbox
                        </h3>
                        <p className="text-[10px] text-neutral-450 mt-0.5">Live records of system OTP codes and customer invoices</p>
                      </div>

                      <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto scrollbar-hide">
                        {adminEmails.length === 0 ? (
                          <div className="py-16 text-center text-xs text-neutral-500 italic">
                            Mailbox empty. Book a service to trigger notifications.
                          </div>
                        ) : (
                          adminEmails.map((em) => (
                            <div key={em.id} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 hover:border-white/10 transition-all text-[11px]">

                              <div className="flex justify-between items-start gap-1 pb-1.5 border-b border-white/5">
                                <div className="min-w-0">
                                  <span className="text-neutral-500 block text-[8px] uppercase tracking-wider font-mono">Recipient to</span>
                                  <span className="font-bold text-red-500 font-mono truncate block">{em.to}</span>
                                </div>
                                <span className="text-[8px] text-neutral-500 font-mono shrink-0 whitespace-nowrap">
                                  {new Date(em.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div>
                                <span className="text-neutral-500 block text-[8px] uppercase tracking-wider font-mono">Subject header</span>
                                <span className="font-semibold text-white leading-tight block mt-0.5">{em.subject}</span>
                              </div>

                              <div className="bg-black/30 rounded p-2 border border-white/5 text-[10px] h-[100px] overflow-y-auto font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed select-text">
                                {em.content}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* INPUT CONTROLS OR FOOTER ACTION AREA (STYLISHLY DOCKED) */}
      <div className="fixed bottom-0 w-full z-50 bg-[#0d0d0d]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-2xl px-6 py-4">

        {/* TEXT INPUT CONTROLLER BOX (Only displayed in Chat Tab) */}
        {activeTab === "chat" && (
          <div className="max-w-[800px] mx-auto flex items-center gap-3 pb-3">
            <div className="flex-1 bg-[#161616] border border-white/10 rounded-full h-12 flex items-center px-4 relative">
              <input
                id="msg_input"
                type="text"
                disabled={isTyping}
                placeholder="Ask AutoIntel about prices, bookings, timings..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isTyping) handleSendChatMessage();
                }}
                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full text-white placeholder:text-neutral-500 text-sm font-medium pr-10 disabled:opacity-50"
              />

            </div>

            <button
              id="send_btn"
              disabled={isTyping || !chatInput.trim()}
              onClick={() => handleSendChatMessage()}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-950/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        )}

        {/* BOTTOM TAB MENU NAVIGATION BAR */}
        <div className="max-w-[800px] mx-auto flex justify-around items-center h-12 border-t border-white/5 pt-3">
          <button
            id="tab_chat_btn"
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center rounded-xl w-14 h-12 transition-all cursor-pointer ${activeTab === "chat" ? "text-red-500 scale-102" : "text-neutral-400 hover:text-red-400"
              }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "chat" ? "'FILL' 1" : "'FILL' 0" }}>chat_bubble</span>
            <span className="text-[9px] font-mono mt-0.5 uppercase tracking-widest font-bold">Chat</span>
          </button>





          <button
            id="tab_admin_btn"
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center justify-center rounded-xl w-14 h-12 transition-all cursor-pointer ${activeTab === "admin" ? "text-red-500 scale-102" : "text-neutral-400 hover:text-red-400"
              }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "admin" ? "'FILL' 1" : "'FILL' 0" }}>admin_panel_settings</span>
            <span className="text-[9px] font-mono mt-0.5 uppercase tracking-widest font-bold">Admin</span>
          </button>
        </div>

      </div>

    </div>
  );
}
