/* =========================================================================
   Blue Wrench Plumbing — Chatbot Config
   -------------------------------------------------------------------------
   Everything content-related for the chat widget lives here. Edit the
   values below to change copy, keywords, or timing — chatbot-widget.js
   should not need to change for content updates.
   ========================================================================= */

// ---- Company info ---------------------------------------------------------
var COMPANY_PHONE = "(555) 010-2938";
var COMPANY_EMAIL = "info@bluewrenchplumbing.com";
var COMPANY_SERVICE_AREA = "Greater Metro Area & surrounding suburbs";

// ---- Keyword-matched replies -----------------------------------------------
// Checked in order, case-insensitive, as a "contains" match against the
// visitor's message (not an exact match). First entry that matches wins.
// Add a new entry anywhere in this array to teach the bot a new topic.
var KEYWORD_RESPONSES = [
  {
    keywords: ["emergency", "urgent", "flooding", "burst"],
    reply: "We offer 24/7 emergency service — call us now at " + COMPANY_PHONE +
      " or leave your number and we'll call you back."
  },
  {
    keywords: ["price", "cost", "quote", "estimate"],
    reply: "Costs vary by job, but we offer free estimates. Want to book one?"
  },
  {
    keywords: ["hours", "open", "available"],
    reply: "We're available 24/7 for emergencies; standard hours are Mon–Sat, 7am–7pm."
  },
  {
    keywords: ["area", "location", "service area"],
    reply: "We serve the " + COMPANY_SERVICE_AREA + " — want to check your zip?"
  },
  {
    keywords: ["water heater"],
    reply: "We install and repair all major water heater brands, tank and tankless."
  },
  {
    keywords: ["drain", "clog"],
    reply: "We handle drain cleaning and clog removal same-day in most cases."
  }
];

// Shown when no keyword above matches the visitor's message.
var FALLBACK_RESPONSE = "Great question — let me connect you with our team.";

// If a visitor's message contains any of these, it's treated as a goodbye
// and (along with closing the window, or 60s of inactivity) can trigger
// the Touch 2 lead-capture ask. See chatbot-widget.js.
var GOODBYE_KEYWORDS = ["bye", "goodbye", "thanks", "thank you", "that's all", "see ya"];

// ---- Lead capture copy ------------------------------------------------------
var LEAD_CAPTURE_TOUCH_1_MESSAGE =
  "Happy to help! Just in case we get disconnected, could I grab your name, phone number, and email so we can follow up if needed? " +
  "You can also reach us directly at " + COMPANY_PHONE + ".";

var LEAD_CAPTURE_TOUCH_2_MESSAGE =
  "Before you go, could I get your name, phone number, and email so we can follow up?";

var LEAD_CAPTURE_TOUCH_2_THANK_YOU =
  "Thanks — we've got your info and someone from our team will follow up shortly. Have a great day!";

var LEAD_CAPTURE_TOUCH_2_SKIPPED_MESSAGE =
  "No problem! You can reach us anytime at " + COMPANY_PHONE + ", " + COMPANY_EMAIL +
  ", or find us serving the " + COMPANY_SERVICE_AREA + ".";

// Greeting shown once, the first time the chat window is opened.
var CHAT_GREETING =
  "Hi there! 👋 I'm the Blue Wrench Plumbing assistant. Ask me about pricing, hours, " +
  "service area, emergencies, and more — how can I help?";

// ---- Timing -----------------------------------------------------------------
var TYPING_DELAY_MIN_MS = 300;
var TYPING_DELAY_MAX_MS = 500;
var INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds, per Touch 2 trigger (c)

// ---- Bundle for chatbot-widget.js -------------------------------------------
window.CHATBOT_CONFIG = {
  companyPhone: COMPANY_PHONE,
  companyEmail: COMPANY_EMAIL,
  companyServiceArea: COMPANY_SERVICE_AREA,
  keywordResponses: KEYWORD_RESPONSES,
  fallbackResponse: FALLBACK_RESPONSE,
  goodbyeKeywords: GOODBYE_KEYWORDS,
  touch1Message: LEAD_CAPTURE_TOUCH_1_MESSAGE,
  touch2Message: LEAD_CAPTURE_TOUCH_2_MESSAGE,
  touch2ThankYou: LEAD_CAPTURE_TOUCH_2_THANK_YOU,
  touch2SkippedMessage: LEAD_CAPTURE_TOUCH_2_SKIPPED_MESSAGE,
  greeting: CHAT_GREETING,
  typingDelayMinMs: TYPING_DELAY_MIN_MS,
  typingDelayMaxMs: TYPING_DELAY_MAX_MS,
  inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS
};
