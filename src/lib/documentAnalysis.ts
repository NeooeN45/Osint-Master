import Tesseract from "tesseract.js";
import type { DocumentMetadata, ExtractedEntity } from "../types";

// Extract text from PDF using OCR
export async function extractTextFromPDF(file: File): Promise<string> {
  // Convert PDF to image(s) first, then OCR
  // For now, we assume the PDF is processed page by page
  const text = await performOCR(file);
  return text;
}

// Perform OCR on image
export async function performOCR(
  file: File | string,
  language = "fra+eng"
): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      file,
      language,
      { 
        logger: (m) => console.log(m),
        errorHandler: (err) => console.error("OCR Error:", err),
      }
    );
    return result.data.text;
  } catch (error) {
    console.error("OCR failed:", error);
    throw new Error(`OCR extraction failed: ${error}`);
  }
}

// Extract metadata from PDF
export async function extractPDFMetadata(file: File): Promise<Partial<DocumentMetadata>> {
  try {
    const buffer = await file.arrayBuffer();
    
    // Basic PDF structure parsing
    const pdfText = new TextDecoder().decode(buffer.slice(0, 5000));
    
    const metadata: Partial<DocumentMetadata> = {
      fileSize: file.size,
      checksum: await calculateChecksum(buffer),
    };
    
    // Try to extract basic PDF metadata from header
    const titleMatch = pdfText.match(/\/Title\s*\(([^)]+)\)/);
    if (titleMatch) metadata.title = titleMatch[1];
    
    const authorMatch = pdfText.match(/\/Author\s*\(([^)]+)\)/);
    if (authorMatch) metadata.author = authorMatch[1];
    
    const creatorMatch = pdfText.match(/\/Creator\s*\(([^)]+)\)/);
    if (creatorMatch) metadata.creator = creatorMatch[1];
    
    const producerMatch = pdfText.match(/\/Producer\s*\(([^)]+)\)/);
    if (producerMatch) metadata.producer = producerMatch[1];
    
    const creationDateMatch = pdfText.match(/\/CreationDate\s*\(([^)]+)\)/);
    if (creationDateMatch) {
      metadata.creationDate = parsePDFDate(creationDateMatch[1]);
    }
    
    const modDateMatch = pdfText.match(/\/ModDate\s*\(([^)]+)\)/);
    if (modDateMatch) {
      metadata.modificationDate = parsePDFDate(modDateMatch[1]);
    }
    
    // Count pages (approximate)
    const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
    if (pageMatches) metadata.pageCount = pageMatches.length;
    
    return metadata;
  } catch (error) {
    console.error("PDF metadata extraction error:", error);
    return {
      fileSize: file.size,
      checksum: await calculateChecksum(await file.arrayBuffer()),
    };
  }
}

// Calculate SHA-256 checksum
async function calculateChecksum(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Parse PDF date format (D:YYYYMMDDHHmmSSOHH'mm')
function parsePDFDate(pdfDate: string): string {
  try {
    // Remove D: prefix if present
    const cleanDate = pdfDate.replace(/^D:/, "");
    
    // Extract components
    const year = cleanDate.slice(0, 4);
    const month = cleanDate.slice(4, 6);
    const day = cleanDate.slice(6, 8);
    const hour = cleanDate.slice(8, 10) || "00";
    const minute = cleanDate.slice(10, 12) || "00";
    const second = cleanDate.slice(12, 14) || "00";
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  } catch {
    return pdfDate;
  }
}

// Extract entities from text using regex patterns
export function extractEntitiesFromText(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Email pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({
      type: "email",
      value: match[0],
      context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      confidence: 95,
    });
  }
  
  // Phone pattern (French + international)
  const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    entities.push({
      type: "phone",
      value: match[0].replace(/[\s.-]/g, ""),
      context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      confidence: 90,
    });
  }
  
  // IP address pattern
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  while ((match = ipRegex.exec(text)) !== null) {
    const ip = match[0];
    const parts = ip.split(".").map(Number);
    if (parts.every(p => p >= 0 && p <= 255)) {
      entities.push({
        type: "ip",
        value: ip,
        context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
        confidence: 95,
      });
    }
  }
  
  // Domain pattern
  const domainRegex = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
  while ((match = domainRegex.exec(text)) !== null) {
    const domain = match[0].toLowerCase();
    if (!domain.includes(".pdf") && !domain.includes(".doc")) {
      entities.push({
        type: "domain",
        value: domain,
        context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
        confidence: 85,
      });
    }
  }
  
  // Crypto address patterns
  const btcRegex = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;
  while ((match = btcRegex.exec(text)) !== null) {
    entities.push({
      type: "crypto",
      value: match[0],
      context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
      confidence: 80,
    });
  }
  
  // Remove duplicates
  const seen = new Set<string>();
  return entities.filter(e => {
    const key = `${e.type}:${e.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Generate document summary using AI
export async function generateDocumentSummary(
  text: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/NeooeN45/Osint-Master",
      "X-Title": "OSINT Master",
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: [
        {
          role: "system",
          content: "You are a document analysis expert. Summarize the following document text in a concise manner, highlighting key information, entities mentioned, and any suspicious or notable content. Respond in French."
        },
        {
          role: "user",
          content: `Document text (first 5000 chars):\n${text.slice(0, 5000)}`
        }
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "No summary available.";
}
