function toNumber(value) {
  const parsed = parseFloat(String(value).replace(/[, ]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOcrText(text) {
  // Keep line structure, but normalize common OCR noise for matching.
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "1")
    .replace(/[@]/g, "a")
    .replace(/[§$]/g, "s")
    .replace(/tot@l/gi, "total")
    .replace(/sub\s+tot[a@]l/gi, "subtotal")
    .replace(/c0ke/gi, "coke")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function compactNumericChunks(text) {
  // Turn OCR-split numbers like "3 7 1 .7 5" into "371.75".
  return String(text || "")
    .replace(/(\d)\s+(?=\d)/g, "$1")
    .replace(/\s*([.,])\s*/g, "$1");
}

function normalizeDate(day, month, year) {
  const y = year.length === 2 ? `20${year}` : year;
  const iso = `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractDate(text) {
  const patterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    if (pattern === patterns[0]) {
      const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
      if (!Number.isNaN(date.getTime())) return date;
    } else if (pattern === patterns[1]) {
      const date = normalizeDate(match[1], match[2], match[3]);
      if (date) return date;
    } else {
      const monthMap = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const month = monthMap[match[2].slice(0, 3).toLowerCase()];
      const date = normalizeDate(match[1], month, match[3]);
      if (date) return date;
    }
  }

  return new Date();
}

function extractAmounts(text) {
  const compact = compactNumericChunks(text);
  const amountMatches = [
    ...compact.matchAll(/(?:rs\.?|inr|₹)?\s*([0-9]{1,8}(?:[.,][0-9]{1,2})?)/gi),
  ];
  return amountMatches
    .map((m) => toNumber(m[1].replace(",", "")))
    .filter((n) => n !== null && n > 0);
}

function extractTotalAmount(text) {
  const compact = compactNumericChunks(text);
  const totalLineRegex =
    /(grand total|total amount|amount due|net amount|total payable|total)\D{0,20}(?:rs\.?|inr|₹)?\s*([0-9]{1,8}(?:[.,][0-9]{1,2})?)/gi;

  let match;
  const totals = [];
  while ((match = totalLineRegex.exec(compact)) !== null) {
    const value = toNumber(match[2].replace(",", ""));
    if (value) totals.push(value);
  }

  if (totals.length > 0) return Math.max(...totals);

  const allAmounts = extractAmounts(text);
  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts);
}

function extractMerchant(lines, fallbackName) {
  const blacklist = /invoice|receipt|tax|gst|bill no|bill#|phone|cashier|address|txn|pay mode/i;
  const candidate = lines.find((line) => line.length > 2 && !blacklist.test(line));
  if (candidate) return candidate.slice(0, 60);

  if (!fallbackName) return "Unknown Merchant";
  return fallbackName
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function extractDescription(lines) {
  const ignored =
    /total|tax|gst|cgst|sgst|subtotal|bill|amount due|txn|pay mode|table|server|qty|rate|amt/i;
  const itemLines = lines.filter(
    (line) =>
      !ignored.test(line) &&
      line.length > 3 &&
      /[a-z]/i.test(line) &&
      /(?:\d+[.,]\d{1,2}|\d{2,})/.test(compactNumericChunks(line))
  );

  if (!itemLines.length) return "Receipt purchase";
  return itemLines.slice(0, 2).join(", ").slice(0, 160);
}

function extractItems(lines) {
  const ignored =
    /total|tax|gst|cgst|sgst|subtotal|bill|amount due|invoice|txn|pay mode|table|server|qty|rate|amt|visit again/i;
  const itemLines = lines.filter(
    (line) =>
      !ignored.test(line) &&
      line.length > 2 &&
      /[a-z]/i.test(line) &&
      /(?:\d+[.,]\d{1,2}|\d{2,})/.test(compactNumericChunks(line))
  );

  if (!itemLines.length) return [];
  return itemLines.slice(0, 6).map((line) => {
    const cleaned = compactNumericChunks(line)
      .replace(/\s{2,}/g, " ")
      .replace(/[^a-zA-Z0-9(),.+\-\/ ]/g, "")
      .trim();
    return cleaned.slice(0, 90);
  });
}

function parseNumberToken(token) {
  return toNumber(compactNumericChunks(String(token || "")));
}

function extractStructuredItems(lines) {
  const ignored =
    /total|tax|gst|cgst|sgst|subtotal|bill|amount due|invoice|txn|pay mode|table|server|qty|rate|amt|visit again/i;

  const structured = [];
  for (const rawLine of lines) {
    const line = compactNumericChunks(rawLine).replace(/\s{2,}/g, " ").trim();
    if (!line || ignored.test(line)) continue;
    if (!/[a-z]/i.test(line)) continue;

    const numericTokens = [...line.matchAll(/([0-9]+(?:[.,][0-9]{1,2})?)/g)].map((m) => ({
      token: m[1],
      index: m.index ?? 0,
    }));
    if (numericTokens.length < 1) continue;

    const namePart = line.slice(0, numericTokens[0].index).replace(/[^a-zA-Z0-9()\-\/ ]/g, "").trim();
    if (!namePart || namePart.length < 2) continue;

    let qty = 1;
    let rate = null;
    let lineTotal = null;

    if (numericTokens.length >= 3) {
      qty = parseNumberToken(numericTokens[0].token) || 1;
      rate = parseNumberToken(numericTokens[1].token);
      lineTotal = parseNumberToken(numericTokens[numericTokens.length - 1].token);
    } else if (numericTokens.length === 2) {
      rate = parseNumberToken(numericTokens[0].token);
      lineTotal = parseNumberToken(numericTokens[1].token);
    } else {
      lineTotal = parseNumberToken(numericTokens[0].token);
    }

    if (!lineTotal || lineTotal <= 0) continue;
    structured.push({
      name: namePart.slice(0, 70),
      qty,
      rate,
      lineTotal,
    });
  }

  return structured.slice(0, 12);
}

function extractNamedAmount(text, labelRegex) {
  const compact = compactNumericChunks(text);
  const regex = new RegExp(`${labelRegex.source}\\D{0,20}(?:rs\\.?|inr|₹)?\\s*([0-9]{1,8}(?:[.,][0-9]{1,2})?)`, "i");
  const match = compact.match(regex);
  if (!match) return null;
  return toNumber((match[1] || "").replace(",", ""));
}

function detectCategory(content) {
  const text = content.toLowerCase();
  const rules = [
    { category: "groceries", keywords: ["supermarket", "mart", "grocery", "vegetable", "milk"] },
    { category: "food", keywords: ["restaurant", "cafe", "swiggy", "zomato", "food"] },
    { category: "shopping", keywords: ["mall", "store", "amazon", "flipkart", "purchase"] },
    { category: "travel", keywords: ["uber", "ola", "metro", "flight", "hotel"] },
    { category: "utilities", keywords: ["electricity", "water", "internet", "broadband", "gas"] },
    { category: "healthcare", keywords: ["pharmacy", "clinic", "hospital", "medical"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }
  return "other-expense";
}

export function scanReceiptLocally({ rawText = "", fileName = "" }) {
  const safeText = normalizeOcrText(rawText);
  const lines = safeText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const derivedText =
    safeText ||
    normalizeOcrText(fileName.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[_-]+/g, " "));
  const amount = extractTotalAmount(derivedText);
  const date = extractDate(derivedText);
  const merchantName = extractMerchant(lines, fileName);
  const items = extractItems(lines);
  const structuredItems = extractStructuredItems(lines);
  const subtotal = extractNamedAmount(derivedText, /sub\s*total|subtotal/i);
  const gst = extractNamedAmount(derivedText, /\bgst\b|cgst|sgst|tax/i);
  const serviceCharge = extractNamedAmount(derivedText, /service charge|srv chrg|service/i);
  const calculatedItemsTotal = structuredItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const chosenTotal = amount || calculatedItemsTotal || 0;
  const modelDecision =
    amount && calculatedItemsTotal
      ? Math.abs(amount - calculatedItemsTotal) <= 2
        ? "total_line_matches_items"
        : "total_line_preferred_over_items"
      : amount
        ? "total_line_detected"
        : calculatedItemsTotal
          ? "items_sum_detected"
          : "insufficient_numeric_signal";
  const description = extractDescription(lines.length ? lines : [merchantName]);
  const category = detectCategory(`${merchantName} ${description} ${derivedText}`);

  return {
    amount: chosenTotal,
    totalPrice: chosenTotal,
    date,
    description: items.length ? items.join(", ") : description,
    item: structuredItems[0]?.name || items[0] || description,
    items,
    structuredItems,
    category,
    merchantName,
    subtotal,
    gst,
    serviceCharge,
    calculatedItemsTotal,
    modelDecision,
    confidence: chosenTotal ? "medium" : "low",
  };
}
