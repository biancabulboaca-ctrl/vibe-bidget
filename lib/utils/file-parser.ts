/**
 * UTILITĂȚI PARSARE FIȘIERE
 *
 * EXPLICAȚIE:
 * Funcții pentru parsarea fișierelor CSV, Excel și PDF în tranzacții.
 *
 * CONCEPTE:
 * - CSV = Comma-Separated Values (valori separate prin virgulă)
 * - Excel = Format binar (.xlsx) al Microsoft
 * - PDF = Portable Document Format (extrase bancare)
 * - Parser = Funcție care transformă text/binary în obiecte JavaScript
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Tipul pentru o tranzacție parsată
 */
export interface ParsedTransaction {
  date: string; // Format: YYYY-MM-DD
  description: string;
  amount: number;
  currency?: string;
  type?: "debit" | "credit";
  originalData?: any; // Datele originale din fișier
}

/**
 * Rezultatul parsării
 */
export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  error?: string;
  rowCount?: number;
}

/**
 * FUNCȚIA 1: Parse CSV
 *
 * Parsează un fișier CSV și extrage tranzacțiile.
 * SUPORT MULTI-FORMAT: Funcționează automat cu diverse formate bancare:
 * - Bănci românești (ING, BCR, BT, Revolut RO): date, descriere, suma, moneda
 * - Bănci rusești/internaționale: Дата, Описание, Сумма, Валюта
 * - Format cu dată timestamp: YYYY-MM-DD HH:MM:SS
 * - Encoding: UTF-8 (suport complet pentru diacritice și Cyrillic)
 *
 * PARAMETRI:
 * @param file - Fișierul CSV (File object din input)
 * @returns Promise cu rezultatul parsării
 *
 * EXEMPLU CSV ROMÂNESC:
 * date,description,amount,currency
 * 01.12.2025,MEGA IMAGE,-45.50,RON
 * 02.12.2025,Salariu,5000.00,RON
 *
 * EXEMPLU CSV RUSESC:
 * Тип,Продукт,Дата начала,Дата выполнения,Описание,Сумма,Комиссия,Валюта
 * Переводы,Сбережения,2025-12-02 08:57:52,2025-12-02 08:57:52,В кошелек,0.10,0.00,EUR
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true, // Prima linie = header-e (nume coloane)
      skipEmptyLines: true, // Ignoră liniile goale
      encoding: 'UTF-8', // Suport pentru caractere speciale (română, rusă, etc)
      complete: (results) => {
        try {
          // Verificăm dacă avem date
          if (!results.data || results.data.length === 0) {
            resolve({
              success: false,
              transactions: [],
              error: "Fișierul CSV este gol",
            });
            return;
          }

          // Transformăm fiecare rând în tranzacție
          const transactions: ParsedTransaction[] = [];

          results.data.forEach((row: any, index: number) => {
            try {
              // Detectăm automat coloanele (flexibil pentru diverse formate)
              const date = detectDate(row);
              const description = detectDescription(row);
              const amount = detectAmount(row);
              const currency = detectCurrency(row);

              if (date && description && amount !== null) {
                transactions.push({
                  date: formatDate(date),
                  description: description.trim(),
                  amount: parseFloat(amount),
                  currency: currency || "RON",
                  type: parseFloat(amount) < 0 ? "debit" : "credit",
                  originalData: row, // Păstrăm datele originale
                });
              }
            } catch (err) {
              console.warn(`Eroare la parsarea rândului ${index + 1}:`, err);
            }
          });

          resolve({
            success: true,
            transactions,
            rowCount: results.data.length,
          });
        } catch (error: any) {
          resolve({
            success: false,
            transactions: [],
            error: error.message,
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          transactions: [],
          error: error.message,
        });
      },
    });
  });
}

/**
 * FUNCȚIA 2: Parse Excel
 *
 * Parsează un fișier Excel (.xlsx) și extrage tranzacțiile.
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ success: false, transactions: [], error: "Nu s-a putut citi fișierul" });
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Citim toate rândurile ca array simplu pentru a detecta header-ul real
        // Unele bănci (ex: Raiffeisen) au 20+ rânduri de metadata înainte de tabel
        const allRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Căutăm rândul de header: rândul cu cel mai mare scor de cuvinte-cheie financiare.
        // Folosim word-boundary pentru "debit"/"credit" ca să nu potrivim "debitor"/"creditor".
        const simpleKeywords = ["data", "suma", "descriere", "description", "amount", "date", "valoare"];
        const boundaryKeywords = ["debit", "credit"]; // trebuie ca cuvinte separate

        const scoreRow = (row: unknown[]): number => {
          const rowText = row.map(c => String(c ?? "").toLowerCase()).join(" ");
          let score = simpleKeywords.filter(k => rowText.includes(k)).length;
          score += boundaryKeywords.filter(k =>
            new RegExp(`(^|[\\s/,;|])${k}([\\s/,;|]|$)`, "i").test(rowText)
          ).length;
          return score;
        };

        let headerRowIndex = 0;
        let bestScore = 0;

        for (let i = 0; i < Math.min(allRows.length, 40); i++) {
          const row = allRows[i];
          if (!Array.isArray(row) || row.length < 2) continue;
          const score = scoreRow(row);
          if (score > bestScore) {
            bestScore = score;
            headerRowIndex = i;
          }
        }

        // DEBUG TEMPORAR
        console.log('[parseExcel] Total rows in sheet:', allRows.length);
        console.log('[parseExcel] Header row detected at index:', headerRowIndex, '(row', headerRowIndex + 1, 'in Excel)');
        console.log('[parseExcel] Header row content:', allRows[headerRowIndex]);
        console.log('[parseExcel] Score of detected header:', bestScore);

        // Construim obiectele folosind rândul de header detectat
        const headers = (allRows[headerRowIndex] as unknown[]).map(h => String(h ?? "").trim());
        const dataRows = allRows.slice(headerRowIndex + 1);

        const jsonData = dataRows
          .filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ""))
          .map(row => {
            const obj: Record<string, unknown> = {};
            headers.forEach((header, idx) => {
              if (header) obj[header] = (row as unknown[])[idx];
            });
            return obj;
          });

        console.log('[parseExcel] Headers found:', headers);
        console.log('[parseExcel] Data rows count:', jsonData.length);
        if (jsonData.length > 0) {
          console.log('[parseExcel] First data row:', jsonData[0]);
        }

        if (jsonData.length === 0) {
          resolve({ success: false, transactions: [], error: "Fișierul Excel este gol sau formatul nu este recunoscut" });
          return;
        }

        const transactions: ParsedTransaction[] = [];

        jsonData.forEach((row: any, index: number) => {
          try {
            const date = detectDate(row);
            const description = detectDescription(row);
            const amount = detectAmount(row);
            const currency = detectCurrency(row);

            if (date && description && amount !== null) {
              const numericAmount = parseFloat(String(amount).replace(/\s/g, "").replace(",", "."));
              if (!isNaN(numericAmount) && numericAmount !== 0) {
                transactions.push({
                  date: formatDate(date),
                  description: description.trim(),
                  amount: numericAmount,
                  currency: currency || "RON",
                  type: numericAmount < 0 ? "debit" : "credit",
                  originalData: row,
                });
              }
            }
          } catch (err) {
            console.warn(`[parseExcel] Eroare la parsarea rândului ${index}:`, err);
          }
        });

        resolve({ success: true, transactions, rowCount: jsonData.length });
      } catch (error: any) {
        resolve({ success: false, transactions: [], error: error.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, transactions: [], error: "Eroare la citirea fișierului" });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * FUNCȚIA 3: Parse PDF - TEMPORAR DEZACTIVATĂ
 *
 * PDF parsing este complex în environment serverless.
 *
 * ALTERNATIVE PENTRU UTILIZATORI:
 * 1. Convertiți PDF → CSV folosind https://www.ilovepdf.com/pdf_to_excel
 * 2. Majoritatea băncilor oferă export CSV direct din aplicație
 * 3. Folosiți Google Sheets pentru a deschide PDF și exporta ca CSV
 */
export async function parsePDF(file: File): Promise<ParseResult> {
  return {
    success: false,
    transactions: [],
    error: 'PDF support este temporar indisponibil. Vă rugăm să convertești PDF-ul în CSV folosind https://www.ilovepdf.com/pdf_to_excel sau să descărcați extractul direct în format CSV de la bancă.',
  };
}

/**
 * FUNCȚII HELPER - Detectare automată coloane
 *
 * Aceste funcții încearcă să ghicească care coloană conține ce informație.
 * Funcționează cu diverse formate de extrase bancare.
 */

function detectDate(row: any): string | null {
  // Căutăm o coloană care arată ca o dată
  // Adăugăm "completed" pentru Revolut (Completed Date)
  // Adăugăm "început" pentru Revolut România (Data de început)
  // NOTĂ: Excel exportă "Ä" în loc de "Ă" pentru caracterele românești
  // RUSSIAN: "Дата начала", "Дата выполнения" (Start Date, Completion Date)
  const dateKeys = [
    "completed", "data", "date", "început", "inceput", "änceput", "start",
    "data operatiunii", "data tranzactiei",
    "дата", "дата начала", "дата выполнения", // Russian: date, start date, completion date
  ];

  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim();
    if (dateKeys.some((k) => normalizedKey.includes(k))) {
      const dateValue = row[key];
      console.log('[detectDate] Found date column:', key, '→', JSON.stringify(dateValue));
      return dateValue;
    }
  }

  // Dacă nu găsim, luăm prima coloană care arată ca o dată
  for (const value of Object.values(row)) {
    if (typeof value === "string" && isDate(value)) {
      console.log('[detectDate] Found date by pattern:', JSON.stringify(value));
      return value;
    }
  }

  console.warn('[detectDate] No date found in row:', row);
  return null;
}

function detectDescription(row: any): string | null {
  // Adăugăm variante cu diacritice pentru Revolut România
  // RUSSIAN: "Описание" (Description)
  // NOTĂ: "beneficiar" eliminat intenționat — "Cod fiscal beneficiar" (Raiffeisen) e coloană goală
  const descKeys = [
    "descriere", "description", "detalii", "details",
    "описание", // Russian: description
  ];

  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().trim();
    if (descKeys.some((k) => normalizedKey.includes(k))) {
      console.log('[detectDescription] Found description column:', key, '→', row[key]);
      return row[key];
    }
  }

  console.warn('[detectDescription] No description found in row:', Object.keys(row));
  return null;
}

function detectAmount(row: any): string | null {
  // Adăugăm "sumă" cu diacritice pentru Revolut România
  // NOTĂ: Excel exportă "SumÄ" (Ä = A-umlaut) în loc de "Sumă" (Ă = A-breve)
  // RUSSIAN: "Сумма" (Amount)
  const amountKeys = [
    "sumă", "sumä", "suma", "amount", "valoare", "value", "total",
    "сумма", // Russian: amount
  ];

  // Detectăm dacă există coloane separate Debit/Credit (format Raiffeisen, ING)
  // Ex: "Suma debit", "Suma credit" → trebuie tratate separat, nu via amountKeys
  let debitValue: string | null = null;
  let creditValue: string | null = null;
  let hasDebitCreditCols = false;

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase().trim();
    if (lowerKey.includes("debit")) {
      debitValue = row[key];
      hasDebitCreditCols = true;
    }
    if (lowerKey.includes("credit")) {
      creditValue = row[key];
      hasDebitCreditCols = true;
    }
  }

  if (!hasDebitCreditCols) {
    // Format coloană unică (ex: "Suma", "Amount") — căutăm direct
    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase().trim();
      const matches = amountKeys.filter(k => normalizedKey.includes(k));
      if (matches.length > 0) {
        console.log('[detectAmount] ✅ MATCH! Key:', `"${key}"`, '→ matched:', matches);
        return row[key];
      }
    }
  }

  // Format Debit/Credit separat: returnăm valoarea care nu e goală
  // Debit = negativ (cheltuială), Credit = pozitiv (venit)
  if (debitValue && String(debitValue).trim() !== "") {
    return `-${String(debitValue).replace(/\s/g, "")}`;
  }
  if (creditValue && String(creditValue).trim() !== "") {
    return String(creditValue).replace(/\s/g, "");
  }

  console.warn('[detectAmount] No amount found in row:', Object.keys(row));
  return null;
}

function detectCurrency(row: any): string | null {
  // RUSSIAN: "Валюта" (Currency)
  const currencyKeys = [
    "moneda", "currency", "valuta",
    "валюта", // Russian: currency
  ];

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase().trim();
    if (currencyKeys.some((k) => lowerKey.includes(k))) {
      return row[key];
    }
  }

  return null;
}

/**
 * Verifică dacă un string arată ca o dată
 */
function isDate(str: string): boolean {
  // Formate acceptate:
  // - DD.MM.YYYY, DD/MM/YYYY (Romanian)
  // - YYYY-MM-DD HH:MM:SS (Russian)
  // - YYYY-MM-DD HH:MM (ISO with timestamp)
  // - YYYY-MM-DD (ISO)
  const dateRegex = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$|^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}(:\d{2})?)?$/;
  return dateRegex.test(str);
}

/**
 * Convertește Excel serial number în dată
 * Excel stochează datele ca număr de zile de la 1 ianuarie 1900
 */
function excelSerialToDate(serial: number): string {
  // Excel epoch: 1 ianuarie 1900 (cu bug: consideră 1900 an bisect)
  const excelEpoch = new Date(1900, 0, 1);
  const days = Math.floor(serial) - 2; // -2 pentru bug-ul Excel 1900
  const milliseconds = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + milliseconds);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formatează data în format ISO (YYYY-MM-DD)
 */
function formatDate(dateStr: string | number): string {
  // DEBUG: Log intrare
  console.log('[formatDate] Input:', JSON.stringify(dateStr), 'Type:', typeof dateStr);

  // Verificăm dacă e Excel serial number (number sau string ce pare număr > 40000)
  const asNumber = typeof dateStr === 'number' ? dateStr : parseFloat(String(dateStr));
  if (!isNaN(asNumber) && asNumber > 40000 && asNumber < 60000) {
    console.log('[formatDate] Excel serial number detected:', asNumber);
    const result = excelSerialToDate(asNumber);
    console.log('[formatDate] Converted to date:', result);
    return result;
  }

  // Dacă e number dar nu e Excel serial, e invalid
  if (typeof dateStr === 'number') {
    console.warn('[formatDate] Invalid number (not Excel serial):', dateStr);
    return new Date().toISOString().split("T")[0];
  }

  // Validare: dacă nu primim string valid, returnăm data curentă
  if (!dateStr || typeof dateStr !== 'string') {
    console.warn('[formatDate] Invalid date string:', dateStr);
    return new Date().toISOString().split("T")[0];
  }

  // Curățăm string-ul (trim whitespace)
  const cleanStr = dateStr.trim();
  console.log('[formatDate] After trim:', JSON.stringify(cleanStr));

  // Dacă e deja ISO format (cu sau fără timestamp)
  // Ex: "2025-12-02 08:57:52" (Russian) sau "2025-12-02" (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    // Extragem doar partea de dată (fără timestamp: " 08:57:52" sau "T08:57:52")
    const result = cleanStr.split(" ")[0].split("T")[0];
    console.log('[formatDate] ISO format detected. Result:', result);
    return result;
  }

  // Format Revolut: DD MMM YYYY (ex: "01 Dec 2024")
  const revolutPattern = /^(\d{2})\s+(\w{3})\s+(\d{4})$/;
  const revolutMatch = cleanStr.match(revolutPattern);

  if (revolutMatch) {
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const day = revolutMatch[1];
    const monthName = revolutMatch[2];
    const year = revolutMatch[3];
    const month = monthMap[monthName];

    if (month) {
      const result = `${year}-${month}-${day}`;
      console.log('[formatDate] Revolut format detected. Result:', result);
      return result;
    }
  }

  // Parsăm formate românești: DD.MM.YYYY sau DD/MM/YYYY
  const parts = cleanStr.split(/[./-]/);
  console.log('[formatDate] Parsed parts:', parts);

  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const result = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    console.log('[formatDate] Romanian format detected. Result:', result);
    return result;
  }

  // Fallback: returnăm data curentă (cu warning)
  console.warn('[formatDate] Could not parse date, using current date:', dateStr);
  return new Date().toISOString().split("T")[0];
}
