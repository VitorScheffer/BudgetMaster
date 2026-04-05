// ─── BudgetMaster — Bank Email Notification → Webhook ────────────────────────
//
// SETUP:
//  1. Go to https://script.google.com → New project
//  2. Paste this entire file
//  3. Fill in the CONFIG values below
//  4. Run processNewBankEmails() once manually to grant Gmail permissions
//  5. Add a time-based trigger: Triggers → Add Trigger
//       Function: processNewBankEmails
//       Event source: Time-driven
//       Type: Minutes timer → Every 5 minutes
//
// ─────────────────────────────────────────────────────────────────────────────

var CONFIG = {
  // Your BudgetMaster deployment URL (no trailing slash)
  WEBHOOK_URL: 'https://your-app.vercel.app/api/webhook/email',

  // Bearer token from BudgetMaster → Settings → Email Webhook
  BEARER_TOKEN: 'paste-your-token-here',

  // The address that forwards the bank emails to this inbox.
  // Since you forward bank alerts to yourself, set this to your own Gmail address.
  // e.g. 'me@gmail.com'
  BANK_SENDER: 'your-gmail@gmail.com',

  // (Optional) Subject keyword to narrow the search — leave empty ('') to skip.
  // Gmail will match emails whose subject contains this string.
  // e.g. 'Transaction Alert'
  SUBJECT_FILTER: 'Transaction Alert',

  // Gmail label applied to processed emails to avoid reprocessing
  PROCESSED_LABEL: 'BudgetMaster/Processed',
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point — called by the time-based trigger.
 * Searches Gmail for unread bank notification emails and processes each one.
 */
function processNewBankEmails() {
  var label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);

  // Search for unread forwarded bank emails that haven't been processed yet
  var query = 'from:' + CONFIG.BANK_SENDER + ' is:unread -label:' + CONFIG.PROCESSED_LABEL;
  if (CONFIG.SUBJECT_FILTER) {
    query += ' subject:' + CONFIG.SUBJECT_FILTER;
  }
  var threads = GmailApp.search(query, 0, 50);

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var message = messages[j];
      if (!message.isUnread()) continue;

      var body = message.getPlainBody();
      var parsed = parseTransactionEmail(body);

      if (parsed) {
        var result = sendToWebhook(parsed);
        Logger.log(
          'Email processed: card=' + parsed.card_last_four +
          ' amount=' + parsed.amount +
          ' desc=' + parsed.description +
          ' result=' + JSON.stringify(result)
        );
      } else {
        Logger.log('Could not parse email: ' + body.substring(0, 200));
      }

      // Mark as processed regardless (avoid infinite retries on unparseable emails)
      message.markRead();
    }
    threads[i].addLabel(label);
  }
}

/**
 * Parses a bank notification email body.
 * Example: "Your card (...3639) was charged $100.59 USD at KIRK MARKET, Cayman Islands."
 *
 * Returns null if the email doesn't match the expected pattern.
 */
function parseTransactionEmail(body) {
  // Card last 4 digits: "(...3639)"
  var cardMatch = body.match(/\(\.\.\.(\d{4})\)/);
  if (!cardMatch) return null;
  var cardLastFour = cardMatch[1];

  // Amount and currency: "$100.59 USD"
  var amountMatch = body.match(/\$([0-9,]+\.[0-9]{2})\s*(USD|KYD)/i);
  if (!amountMatch) return null;
  var amount = -1 * parseFloat(amountMatch[1].replace(/,/g, '')); // charge = expense = negative
  var currency = amountMatch[2].toUpperCase();

  // Merchant name: "at KIRK MARKET, Cayman Islands"
  var merchantMatch = body.match(/charged\s+\$[0-9,.]+\s*(?:USD|KYD)\s+at\s+([^,\.]+)/i);
  if (!merchantMatch) return null;
  var description = merchantMatch[1].trim().toUpperCase();

  // Date: use the day the email was processed (notification arrives same day as charge)
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  return {
    card_last_four: cardLastFour,
    amount: amount,
    description: description,
    date: today,
    currency: currency,
  };
}

/**
 * POSTs the parsed transaction to the BudgetMaster webhook endpoint.
 */
function sendToWebhook(payload) {
  var options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CONFIG.BEARER_TOKEN,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code !== 200) {
    Logger.log('Webhook error ' + code + ': ' + body);
  }

  try {
    return JSON.parse(body);
  } catch (e) {
    return { raw: body };
  }
}

/**
 * Returns the Gmail label with the given name, creating it if it doesn't exist.
 */
function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}
