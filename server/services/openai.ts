import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

type RawTransaction = {
  date: string;
  description: string;
  amount: string;
  [key: string]: string;
};

type ClassifiedTransaction = {
  date: string;
  description: string;
  amount: string;
  category: string;
};

/**
 * Creates a temporary CSV file from transactions
 */
async function createTempCSVFile(transactions: RawTransaction[]): Promise<string> {
  // Create header
  const headers = ["date", "description", "amount"];
  const csvRows = [headers.join(",")];
  
  // Add data rows
  for (const tx of transactions) {
    const row = [
      tx.date || "",
      `"${tx.description.replace(/"/g, '""')}"`, // Handle quotes in description
      tx.amount || ""
    ];
    csvRows.push(row.join(","));
  }
  
  // Create temp file
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `transactions_${Date.now()}.csv`);
  
  // Write to file
  fs.writeFileSync(tempFilePath, csvRows.join("\n"));
  return tempFilePath;
}

/**
 * Simple version that just uses the chat API directly
 * This is a simpler implementation for demo purposes
 */
export async function analyzeTransactions(
  transactions: RawTransaction[]
): Promise<ClassifiedTransaction[]> {
  try {
    if (!openai.apiKey) {
      throw new Error("OpenAI API key is missing");
    }
    
    // For demo purposes, we'll avoid file APIs and just use a direct chat approach
    const transactionText = transactions.map(tx => 
      `Date: ${tx.date}, Description: ${tx.description}, Amount: ${tx.amount}`
    ).join('\n');

    // Call OpenAI Chat API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a financial transaction classifier specializing in payroll accounting. 
          Your task is to analyze transactions and classify each one into the most appropriate category for QuickBooks.
          
          Use ONLY the following categories:
          - Employee Salary
          - Contractor Payment
          - Tax Payment
          - Benefits & Insurance
          - Bonuses
          - Reimbursements
          - Other Payroll Expense
          
          Format your response as a valid JSON array of objects with properties: date, description, amount, and category.`
        },
        {
          role: "user",
          content: `Please classify these payroll transactions:\n\n${transactionText}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(content);
    
    // Handle different response formats
    if (Array.isArray(jsonResponse)) {
      return jsonResponse as ClassifiedTransaction[];
    } else if (jsonResponse.transactions && Array.isArray(jsonResponse.transactions)) {
      return jsonResponse.transactions as ClassifiedTransaction[];
    } else if (jsonResponse.results && Array.isArray(jsonResponse.results)) {
      return jsonResponse.results as ClassifiedTransaction[];
    } else {
      // Look for any array property in the response
      for (const key in jsonResponse) {
        if (Array.isArray(jsonResponse[key])) {
          return jsonResponse[key] as ClassifiedTransaction[];
        }
      }
      throw new Error("Could not find transaction array in response");
    }
  } catch (error: any) {
    console.error("Error classifying transactions:", error);
    
    // If OpenAI call fails, return transactions with "Uncategorized" category as fallback
    return transactions.map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      category: "Uncategorized"
    }));
  }
}
