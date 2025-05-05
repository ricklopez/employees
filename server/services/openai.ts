import OpenAI from "openai";

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
 * Analyzes and classifies transactions using OpenAI
 * @param transactions Raw transactions parsed from CSV
 * @returns Classified transactions with appropriate categories
 */
export async function analyzeTransactions(
  transactions: RawTransaction[]
): Promise<ClassifiedTransaction[]> {
  try {
    if (!openai.apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    // Prepare the transactions for the API request
    const transactionStrings = transactions.map(
      (tx) => `Date: ${tx.date}, Description: ${tx.description}, Amount: ${tx.amount}`
    );

    // Create a context for the AI to understand what we want
    const prompt = `
      You are a financial transaction classifier specializing in payroll. 
      Analyze these transactions and classify each one into the most appropriate category for QuickBooks.
      
      Use ONLY the following categories:
      - Employee Salary
      - Contractor Payment
      - Tax Payment
      - Benefits & Insurance
      - Bonuses
      - Reimbursements
      - Other Payroll Expense
      
      For each transaction, respond with the same transaction data but add the appropriate category.
      Format your response as a valid JSON array with properties: date, description, amount, and category.
      
      Transactions:
      ${transactionStrings.join("\n")}
    `;

    // Call the OpenAI API for classification
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a payroll accounting expert who can accurately categorize financial transactions." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more deterministic responses
    });

    // Extract the classified transactions from the response
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Failed to get classification from OpenAI");
    }

    // Parse the response
    const parsedResponse = JSON.parse(content);
    
    if (!Array.isArray(parsedResponse.transactions)) {
      // If OpenAI didn't return an array property, check if the whole response is an array
      if (Array.isArray(parsedResponse)) {
        return parsedResponse as ClassifiedTransaction[];
      }
      throw new Error("Invalid response format from OpenAI");
    }

    return parsedResponse.transactions as ClassifiedTransaction[];
  } catch (error: any) {
    console.error("Error classifying transactions:", error);
    
    // If OpenAI call fails, return transactions with "Uncategorized" category
    return transactions.map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      category: "Uncategorized"
    }));
  }
}
