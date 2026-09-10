/* =========================================================================
   Blue Wrench Plumbing — Chatbot Config
   -------------------------------------------------------------------------
   Everything content-related for the chat widget lives here. Edit the
   values below to change copy, keywords, or timing — chatbot-widget.js
   should not need to change for content updates.

   Built to spec: blue-wrench-chatbot-spec.md
   ========================================================================= */

(function () {
  "use strict";

  // ---- Company info ---------------------------------------------------------
  var COMPANY_PHONE = "(555) 010-2938";
  var COMPANY_EMAIL = "info@bluewrenchplumbing.com";
  var SERVICE_AREA = "Greater Metro Area & surrounding suburbs";

  // ---- Keyword bank (spec §3) -------------------------------------------------
  // Checked in order, case-insensitive, as a "contains" match against the
  // visitor's message. First matching category wins. A category may define
  // `subMatches` (checked in order) for a more specific reply; if none of a
  // matched category's subMatches hit, its general `reply` is used.
  var KEYWORD_CATEGORIES = [
    {
      name: "emergency",
      keywords: ["emergency", "burst", "leak", "leaking", "flooding", "flood", "urgent", "asap", "right now"],
      reply: "We handle emergencies 24/7 — burst pipe at 2am, we're typically there in under an hour. " +
        "Call us right now at " + COMPANY_PHONE + " and we'll get someone dispatched."
    },
    {
      name: "services",
      keywords: ["drain", "clog", "clogged", "water heater", "tank", "tankless", "pipe", "repipe",
        "replace", "replacement", "install", "installation", "remodel"],
      subMatches: [
        {
          keywords: ["drain", "clog", "clogged"],
          reply: "We do camera inspection and hydro-jetting to clear clogs for good, not just today."
        },
        {
          keywords: ["water heater", "tank", "tankless"],
          reply: "We install tank or tankless water heaters, sized right for your home — often same-day."
        },
        {
          keywords: ["pipe", "repipe"],
          reply: "We offer trenchless repipe options that skip the demolition wherever possible."
        }
      ],
      reply: "We handle emergency repairs, drain cleaning, water heater installs, and pipe replacement. " +
        "What's going on with your plumbing?"
    },
    {
      name: "hours",
      keywords: ["hours", "open", "when", "available", "close", "closing"],
      reply: "We're open Mon–Sat, 7am–7pm, and 24/7 for emergencies."
    },
    {
      name: "pricing",
      keywords: ["cost", "price", "pricing", "quote", "how much", "estimate", "fee"],
      reply: "We give free quotes — we don't post fixed prices online since every job's different. " +
        "Share a few details here and we'll get you a number, or leave your contact info and we'll follow up."
    },
    {
      name: "serviceArea",
      keywords: ["area", "location", "where", "serve", "suburbs"],
      reply: "We serve the " + SERVICE_AREA + "."
    },
    {
      name: "trust",
      keywords: ["licensed", "insured", "license", "insurance", "guarantee", "warranty",
        "background", "trust", "reviews", "rating"],
      reply: "We're licensed and insured, every tech is background-checked, and all work is backed by a " +
        "one-year workmanship guarantee. We've been doing this since 2011 — 4.9★ average, 6,200+ jobs completed."
    }
  ];

  // Shown when no category above matches the visitor's message.
  var FALLBACK_RESPONSE = "I might not have the exact answer to that, but our team can help directly — " +
    "call " + COMPANY_PHONE + " or leave your info and we'll follow up.";

  // Any of these in a message (along with closing the window, or 60s of
  // inactivity) triggers the second lead-capture ask. See chatbot-widget.js.
  var GOODBYE_WORDS = ["bye", "goodbye", "thanks", "thank you", "that's all", "ok thanks"];

  // Greeting shown once, the first time the chat window is opened.
  var CHAT_GREETING = "Hi there! I'm the Blue Wrench Plumbing assistant. Ask me about pricing, hours, " +
    "service area, emergencies, and more — how can I help?";

  // ---- Lead capture copy (spec §4) --------------------------------------------
  var LEAD_CAPTURE_FIRST_MESSAGE = "Happy to help! Before I answer, mind sharing your name, phone, and " +
    "email in case we get disconnected? You can also just skip this and ask away.";

  var LEAD_CAPTURE_FIRST_THANK_YOU = "Thanks, {name} — got it.";
  var LEAD_CAPTURE_FIRST_THANK_YOU_NO_NAME = "Thanks — got it.";

  var LEAD_CAPTURE_SECOND_MESSAGE = "Before you go — want us to follow up? Leave your name and number.";

  var LEAD_CAPTURE_SECOND_THANK_YOU = "Thanks — we've got your info and someone from our team will follow " +
    "up shortly. Have a great day!";

  var LEAD_CAPTURE_FINAL_CONTACT_BLOCK = "You can always reach us at " + COMPANY_PHONE + " or " +
    COMPANY_EMAIL + ". We serve the " + SERVICE_AREA + ".";

  // ---- Timing (spec §5) --------------------------------------------------------
  var TYPING_DELAY_MIN_MS = 400;
  var TYPING_DELAY_MAX_MS = 1100;
  var INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds of inactivity after the last bot message

  // ---- Bundle for chatbot-widget.js -------------------------------------------
  // Matches the literal shape from spec §5, plus the additional keys the
  // widget needs for keyword matching and copy.
  window.CHATBOT_CONFIG = {
    inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
    typingDelayMinMs: TYPING_DELAY_MIN_MS,
    typingDelayMaxMs: TYPING_DELAY_MAX_MS,
    companyPhone: COMPANY_PHONE,
    companyEmail: COMPANY_EMAIL,
    serviceArea: SERVICE_AREA,
    goodbyeWords: GOODBYE_WORDS,

    keywordCategories: KEYWORD_CATEGORIES,
    fallbackResponse: FALLBACK_RESPONSE,
    greeting: CHAT_GREETING,

    leadFirstMessage: LEAD_CAPTURE_FIRST_MESSAGE,
    leadFirstThankYou: LEAD_CAPTURE_FIRST_THANK_YOU,
    leadFirstThankYouNoName: LEAD_CAPTURE_FIRST_THANK_YOU_NO_NAME,
    leadSecondMessage: LEAD_CAPTURE_SECOND_MESSAGE,
    leadSecondThankYou: LEAD_CAPTURE_SECOND_THANK_YOU,
    leadFinalContactBlock: LEAD_CAPTURE_FINAL_CONTACT_BLOCK
  };
})();
