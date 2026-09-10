/* =========================================================================
   Blue Wrench Plumbing — Chatbot Widget
   -------------------------------------------------------------------------
   Plain vanilla JS. No external dependencies, no network calls. Reads all
   copy/keywords/timing from window.CHATBOT_CONFIG (chatbot-config.js),
   which must be loaded before this file.

   Builds its own DOM and injects it at the end of <body>, so it doesn't
   require any markup changes to the host page.

   Built to spec: blue-wrench-chatbot-spec.md
   ========================================================================= */

(function () {
  "use strict";

  var CFG = window.CHATBOT_CONFIG;
  if (!CFG) {
    console.error("[Blue Wrench Chatbot] window.CHATBOT_CONFIG not found — make sure chatbot-config.js is loaded before chatbot-widget.js.");
    return;
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  var hasGreeted = false;
  var firstMessageSent = false;
  var pendingFirstMessage = "";
  var touch1Resolved = false;

  var activeLeadForm = null;   // 'touch1' | 'touch2' | null
  var touch2Fired = false;
  var touch2Resolved = false;
  var touch2Source = null;     // 'close' | 'goodbye' | 'inactivity'
  var hasContactInfo = false;  // true once a lead form is submitted with a usable name + (phone or email)

  var inactivityTimer = null;

  // ---------------------------------------------------------------------
  // DOM references (populated in buildWidget)
  // ---------------------------------------------------------------------
  var els = {};

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function scrollToBottom() {
    els.body.scrollTop = els.body.scrollHeight;
  }

  function addUserMessage(text) {
    var msg = el("div", "bwp-msg bwp-msg-user", text);
    els.body.appendChild(msg);
    scrollToBottom();
  }

  function addBotMessage(text) {
    var msg = el("div", "bwp-msg bwp-msg-bot", text);
    els.body.appendChild(msg);
    scrollToBottom();
  }

  function addTypingIndicator() {
    var wrap = el("div", "bwp-msg-typing");
    wrap.setAttribute("aria-label", "Assistant is typing");
    wrap.appendChild(el("span"));
    wrap.appendChild(el("span"));
    wrap.appendChild(el("span"));
    els.body.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function randomTypingDelay() {
    var min = CFG.typingDelayMinMs;
    var max = CFG.typingDelayMaxMs;
    return min + Math.random() * (max - min);
  }

  // Shows a typing indicator, waits a short randomized delay, then swaps it
  // for the bot's message. Calls `cb` once the message is on screen.
  function botReply(text, cb) {
    var indicator = addTypingIndicator();
    setTimeout(function () {
      indicator.remove();
      addBotMessage(text);
      if (typeof cb === "function") cb();
    }, randomTypingDelay());
  }

  // Keyword matching (spec §3). First category whose keyword list matches
  // wins. A category with `subMatches` picks the most specific reply it can;
  // otherwise falls back to its own general `reply`.
  function matchKeyword(message) {
    var lower = message.toLowerCase();

    function containsAny(keywords) {
      for (var i = 0; i < keywords.length; i++) {
        if (lower.indexOf(keywords[i].toLowerCase()) !== -1) return true;
      }
      return false;
    }

    for (var i = 0; i < CFG.keywordCategories.length; i++) {
      var category = CFG.keywordCategories[i];
      if (!containsAny(category.keywords)) continue;

      if (category.subMatches) {
        for (var j = 0; j < category.subMatches.length; j++) {
          if (containsAny(category.subMatches[j].keywords)) {
            return category.subMatches[j].reply;
          }
        }
      }
      return category.reply;
    }

    return CFG.fallbackResponse;
  }

  function isGoodbye(message) {
    var lower = message.toLowerCase();
    return CFG.goodbyeWords.some(function (word) {
      return lower.indexOf(word.toLowerCase()) !== -1;
    });
  }

  // ---------------------------------------------------------------------
  // Inactivity timer — 60s of inactivity after the last bot message fires
  // Touch 2 (spec §2.7c). Only armed once Touch 1 is resolved; disarmed
  // once Touch 2 has fired.
  // ---------------------------------------------------------------------
  function resetInactivityTimer() {
    clearInactivityTimer();
    if (touch1Resolved && !touch2Fired) {
      inactivityTimer = setTimeout(function () {
        triggerTouch2("inactivity");
      }, CFG.inactivityTimeoutMs);
    }
  }

  function clearInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  // ---------------------------------------------------------------------
  // Lead capture (shared by Touch 1 and Touch 2, spec §4)
  // ---------------------------------------------------------------------
  function showLeadForm(kind) {
    activeLeadForm = kind;
    setInputEnabled(false);
    var message = kind === "touch1" ? CFG.leadFirstMessage : CFG.leadSecondMessage;
    botReply(message, function () {
      renderLeadFormBubble(kind);
    });
  }

  function renderLeadFormBubble(kind) {
    var wrap = el("form", "bwp-lead-form");
    wrap.setAttribute("novalidate", "true");

    var nameField = buildField("bwp-lead-name-" + kind, "Name", "text", "Jordan Lee");
    var phoneField = buildField("bwp-lead-phone-" + kind, "Phone", "tel", "(555) 000-0000");
    var fields = [nameField, phoneField];

    if (kind === "touch1") {
      var emailField = buildField("bwp-lead-email-" + kind, "Email", "email", "jordan@email.com");
      fields.push(emailField);
    }

    fields.forEach(function (f) { wrap.appendChild(f.wrapper); });

    var actions = el("div", "bwp-lead-form-actions");
    var submitBtn = el("button", "bwp-lead-submit", "Submit");
    submitBtn.type = "submit";
    var skipBtn = el("button", "bwp-lead-skip", kind === "touch1" ? "No thanks, just answer my question" : "No thanks");
    skipBtn.type = "button";
    actions.appendChild(submitBtn);
    actions.appendChild(skipBtn);
    wrap.appendChild(actions);

    if (kind === "touch1") {
      var dismiss = el("button", "bwp-lead-dismiss", "×");
      dismiss.type = "button";
      dismiss.setAttribute("aria-label", "Dismiss");
      dismiss.addEventListener("click", function () {
        wrap.remove();
        handleLeadSkip(kind);
      });
      wrap.appendChild(dismiss);
    }

    wrap.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {
        name: nameField.input.value.trim(),
        phone: phoneField.input.value.trim(),
        email: fields.length > 2 ? fields[2].input.value.trim() : ""
      };
      wrap.remove();
      handleLeadSubmit(kind, values);
    });

    skipBtn.addEventListener("click", function () {
      wrap.remove();
      handleLeadSkip(kind);
    });

    els.body.appendChild(wrap);
    scrollToBottom();
    nameField.input.focus();
  }

  function buildField(id, labelText, type, placeholder) {
    var wrapper = el("div");
    var label = el("label", null, labelText);
    label.setAttribute("for", id);
    var input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.placeholder = placeholder;
    input.autocomplete = "off";
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return { wrapper: wrapper, input: input };
  }

  function logLead(kind, values, provided) {
    var entry = {
      name: values.name || "",
      phone: values.phone || "",
      email: values.email || "",
      timestamp: new Date().toISOString(),
      provided: provided
    };
    if (kind === "touch1") entry.firstMessage = pendingFirstMessage;
    // Stub: no backend yet — this is where a real submission would POST.
    // (Matches the site's existing contact form, which is also demo-only.)
    console.log("[Blue Wrench Chatbot] Lead capture (" + kind + "):", entry);
  }

  function isCompleteLead(values) {
    return !!(values.name && (values.phone || values.email));
  }

  function handleLeadSubmit(kind, values) {
    var complete = isCompleteLead(values);
    logLead(kind, values, true);
    activeLeadForm = null;
    if (complete) hasContactInfo = true;

    if (kind === "touch1") {
      resolveTouch1(complete ? values.name : null);
    } else {
      resolveTouch2(complete);
    }
  }

  function handleLeadSkip(kind) {
    logLead(kind, { name: "", phone: "", email: "" }, false);
    activeLeadForm = null;
    if (kind === "touch1") {
      resolveTouch1(null);
    } else {
      resolveTouch2(false);
    }
  }

  function resolveTouch1(name) {
    touch1Resolved = true;
    setInputEnabled(true);
    var ackAndAnswer = function () {
      var reply = matchKeyword(pendingFirstMessage);
      botReply(reply, function () {
        resetInactivityTimer();
      });
    };
    if (name) {
      var thankYou = CFG.leadFirstThankYou.replace("{name}", name);
      botReply(thankYou, ackAndAnswer);
    } else {
      ackAndAnswer();
    }
  }

  function resolveTouch2(submitted) {
    touch2Resolved = true;
    clearInactivityTimer();
    setInputEnabled(false); // conversation is wrapping up
    var message = submitted ? CFG.leadSecondThankYou : CFG.leadFinalContactBlock;
    botReply(message, function () {
      if (touch2Source === "close") {
        setTimeout(closeWidget, 1800);
      }
    });
  }

  // Fires Touch 2 exactly once per session, from whichever trigger reaches
  // it first: close button, goodbye keyword, or 60s inactivity (spec §2.7).
  // If the visitor already gave complete contact info at Touch 1, skip
  // straight to the final contact block instead of asking again.
  function triggerTouch2(source) {
    if (touch2Fired) return;
    touch2Fired = true;
    touch2Source = source;
    clearInactivityTimer();
    if (hasContactInfo) {
      resolveTouch2(true);
    } else {
      showLeadForm("touch2");
    }
  }

  function setInputEnabled(enabled) {
    els.input.disabled = !enabled;
    els.sendBtn.disabled = !enabled;
    if (enabled) els.input.focus();
  }

  // ---------------------------------------------------------------------
  // Message send handling
  // ---------------------------------------------------------------------
  function handleUserSend(rawText) {
    var text = rawText.trim();
    if (!text || els.input.disabled) return;

    addUserMessage(text);
    els.input.value = "";

    // Spec §2.2-2.3: before answering the FIRST message, show the lead form.
    if (!firstMessageSent) {
      firstMessageSent = true;
      pendingFirstMessage = text;
      showLeadForm("touch1");
      return;
    }

    if (touch1Resolved && !touch2Fired) {
      resetInactivityTimer();

      if (isGoodbye(text)) {
        triggerTouch2("goodbye");
        return;
      }
    }

    var reply = matchKeyword(text);
    botReply(reply, function () {
      resetInactivityTimer();
    });
  }

  // ---------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------
  function openWidget() {
    els.window.hidden = false;
    els.bubble.setAttribute("aria-expanded", "true");
    if (!hasGreeted) {
      hasGreeted = true;
      botReply(CFG.greeting);
    }
    if (!els.input.disabled) els.input.focus();
  }

  function closeWidget() {
    els.window.hidden = true;
    els.bubble.setAttribute("aria-expanded", "false");
  }

  // Implements Touch 2 trigger (a) plus the interactions around it:
  //  - No conversation yet: just close.
  //  - Touch 1 form still open/unresolved: treat as a skip, then close
  //    (too early to also ask the Touch 2 questions).
  //  - Touch 1 resolved, Touch 2 not yet fired: fire Touch 2 and keep the
  //    window open to show the ask (don't close out from under it).
  //  - Touch 2 form open/unresolved: treat this click as a skip, then close.
  //  - Touch 2 already resolved: just close.
  function handleCloseClick() {
    if (!firstMessageSent) {
      closeWidget();
      return;
    }

    if (touch2Resolved) {
      closeWidget();
      return;
    }

    if (activeLeadForm === "touch2") {
      var openForm = els.body.querySelector(".bwp-lead-form");
      if (openForm) openForm.remove();
      handleLeadSkip("touch2");
      closeWidget();
      return;
    }

    if (!touch1Resolved) {
      if (activeLeadForm === "touch1") {
        var openTouch1Form = els.body.querySelector(".bwp-lead-form");
        if (openTouch1Form) openTouch1Form.remove();
        handleLeadSkip("touch1");
      }
      closeWidget();
      return;
    }

    if (!touch2Fired) {
      triggerTouch2("close");
      return; // stay open so the visitor sees the Touch 2 ask
    }

    closeWidget();
  }

  // ---------------------------------------------------------------------
  // Build DOM
  // ---------------------------------------------------------------------
  function buildWidget() {
    var root = el("div");
    root.id = "bwp-chat-widget";

    // Bubble
    var bubble = el("button", "bwp-chat-bubble");
    bubble.type = "button";
    bubble.setAttribute("aria-label", "Open chat with Blue Wrench Plumbing");
    bubble.setAttribute("aria-expanded", "false");
    bubble.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      "</svg>";

    // Window
    var win = el("div", "bwp-chat-window");
    win.hidden = true;
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Chat with Blue Wrench Plumbing");

    var header = el("div", "bwp-chat-header");
    var headerText = el("div");
    headerText.appendChild(el("div", "bwp-chat-title", "Blue Wrench Plumbing"));
    headerText.appendChild(el("div", "bwp-chat-subtitle", "Usually replies in a few minutes"));
    var closeBtn = el("button", "bwp-chat-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close chat");
    header.appendChild(headerText);
    header.appendChild(closeBtn);

    var body = el("div", "bwp-chat-body");
    body.setAttribute("aria-live", "polite");

    var inputRow = el("form", "bwp-chat-input-row");
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a message…";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Type a message");
    var sendBtn = el("button", "bwp-chat-send");
    sendBtn.type = "submit";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
      "</svg>";
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    // Persistent footer (spec §2.5): the phone number, always visible,
    // not repeated as text alongside every individual bot reply.
    var footer = el("div", "bwp-chat-footer");
    footer.appendChild(document.createTextNode("Call us anytime: "));
    var footerLink = el("a", null, CFG.companyPhone);
    footerLink.href = "tel:" + CFG.companyPhone.replace(/[^\d+]/g, "");
    footer.appendChild(footerLink);

    win.appendChild(header);
    win.appendChild(body);
    win.appendChild(footer);
    win.appendChild(inputRow);

    root.appendChild(win);
    root.appendChild(bubble);
    document.body.appendChild(root);

    els = {
      root: root,
      bubble: bubble,
      window: win,
      closeBtn: closeBtn,
      body: body,
      inputForm: inputRow,
      input: input,
      sendBtn: sendBtn
    };

    bubble.addEventListener("click", function () {
      if (els.window.hidden) {
        openWidget();
      } else {
        closeWidget();
      }
    });

    closeBtn.addEventListener("click", handleCloseClick);

    inputRow.addEventListener("submit", function (e) {
      e.preventDefault();
      handleUserSend(input.value);
    });
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
