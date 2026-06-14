export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isCompletedBooking?: boolean;
  bookingData?: any;
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  carModel: string;
  service: string;
  date: string;
  time: string;
  status: "Confirmed" | "Completed" | "Pending" | "Cancelled";
  createdAt: string;
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  content: string;
  timestamp: string;
}
