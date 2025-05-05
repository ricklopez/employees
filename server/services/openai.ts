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
 * Mock implementation for demo purposes
 * This returns predefined categories for specific transaction types
 */
export async function analyzeTransactions(
  transactions: RawTransaction[]
): Promise<ClassifiedTransaction[]> {
  try {
    console.log("Mocking transaction analysis...");
    
    // Create a mapping for common transaction types to categories
    const categoryMap: Record<string, string> = {
      'INTEREST': 'Other Payroll Expense',
      'BPAY': 'Tax Payment',
      'ASIC': 'Tax Payment',
      'MACQUARIE': 'Other Payroll Expense',
      'CMA INTEREST': 'Other Payroll Expense',
      'DEPOSIT': 'Other Payroll Expense',
      'WITHDRAWAL': 'Tax Payment',
      'CONTRIBUT': 'Benefits & Insurance',
      'SALARY': 'Employee Salary',
      'PAY': 'Employee Salary',
      'CONTRACTOR': 'Contractor Payment',
      'INSURANCE': 'Benefits & Insurance',
      'HEALTH': 'Benefits & Insurance',
      'TAX': 'Tax Payment',
      'BONUS': 'Bonuses',
      'TRAVEL': 'Reimbursements',
      'REIMBURS': 'Reimbursements',
      'MEDICARE': 'Benefits & Insurance',
      'SOCIAL SECURITY': 'Tax Payment',
      'WITHHOLDING': 'Tax Payment',
      'MATCH': 'Benefits & Insurance'
    };
    
    // For each transaction, determine its category based on description or other fields
    const classifiedTransactions = transactions.map(tx => {
      // Default category
      let category = 'Other Payroll Expense';
      
      // Find matching category based on description
      const description = tx.description.toUpperCase();
      for (const [keyword, mappedCategory] of Object.entries(categoryMap)) {
        if (description.includes(keyword.toUpperCase())) {
          category = mappedCategory;
          break;
        }
      }
      
      // Create clean amount value
      let amount = tx.amount || '';
      if (amount.startsWith('$')) {
        amount = amount.substring(1);
      }
      
      // Create classified transaction
      return {
        date: tx.date,
        description: tx.description,
        amount: amount,
        category: category
      };
    });
    
    console.log(`Classified ${classifiedTransactions.length} transactions`);
    return classifiedTransactions;
    
  } catch (error: any) {
    console.error("Error mocking transaction analysis:", error);
    
    // Return fallback categorization
    return transactions.map(tx => {
      // Clean amount if needed
      let amount = tx.amount || '';
      if (amount.startsWith('$')) {
        amount = amount.substring(1);
      }
      
      return {
        date: tx.date,
        description: tx.description,
        amount: amount,
        category: "Other Payroll Expense"
      };
    });
  }
}
