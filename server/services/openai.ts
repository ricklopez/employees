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
 * Uploads a file to OpenAI and returns the file ID
 */
async function uploadFileToOpenAI(filePath: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  const response = await openai.files.create({
    file: fileStream,
    purpose: "assistants"
  });
  return response.id;
}

/**
 * Analyzes and classifies transactions using OpenAI
 * @param transactions Raw transactions parsed from CSV
 * @returns Classified transactions with appropriate categories
 */
export async function analyzeTransactions(
  transactions: RawTransaction[]
): Promise<ClassifiedTransaction[]> {
  let fileId = '';
  let tempFilePath = '';
  
  try {
    if (!openai.apiKey) {
      throw new Error("OpenAI API key is missing");
    }
    
    // Create a temporary CSV file
    tempFilePath = await createTempCSVFile(transactions);
    
    // Upload the file to OpenAI
    fileId = await uploadFileToOpenAI(tempFilePath);
    
    // Create an Assistant
    const assistant = await openai.beta.assistants.create({
      name: "Payroll Classifier",
      instructions: `You are a financial transaction classifier specializing in payroll. 
      Analyze the CSV file of transactions and classify each one into the most appropriate category for QuickBooks.
      
      Use ONLY the following categories:
      - Employee Salary
      - Contractor Payment
      - Tax Payment
      - Benefits & Insurance
      - Bonuses
      - Reimbursements
      - Other Payroll Expense
      
      Format your response as a valid JSON array of objects with properties: date, description, amount, and category.`,
      tools: [{ type: "file_search" as const }],
      model: OPENAI_MODEL,
    });

    // For the demo purposes, we'll simplify and use the Chat API directly
    // In a production app, you'd use the Assistants API with proper error handling
    
    // Create a Thread
    const thread = await openai.beta.threads.create();
    
    // Add a Message to the Thread with instructions
    const messageContent = "Please analyze the transactions in the attached CSV file and classify each one into the appropriate payroll category. Return the results as a JSON array with date, description, amount, and category properties.";
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: messageContent
    });
    
    // Run the Assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    
    // Poll for the Run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Simple polling - in production, you would use a more robust polling mechanism
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      // Wait for 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    if (runStatus.status === "failed") {
      throw new Error(`Run failed with error: ${runStatus.last_error?.message || "Unknown error"}`);
    }
    
    // Retrieve the messages from the Thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Get the latest assistant message
    const lastMessage = messages.data.filter(m => m.role === "assistant")[0];
    
    if (!lastMessage || !lastMessage.content || lastMessage.content.length === 0) {
      throw new Error("No response from assistant");
    }
    
    const content = lastMessage.content[0];
    
    if (content.type !== "text") {
      throw new Error("Unexpected content type in response");
    }
    
    // Try to extract JSON from the text response
    const contentText = content.text.value;
    
    // Find JSON in the response - look for array between square brackets
    const jsonMatch = contentText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error("Could not find valid JSON in the response");
    }
    
    const jsonStr = jsonMatch[0];
    const parsedTransactions = JSON.parse(jsonStr);
    
    if (!Array.isArray(parsedTransactions)) {
      throw new Error("Expected array of transactions in response");
    }
    
    // Clean up - delete the Assistant, Thread, and File
    await openai.beta.assistants.del(assistant.id);
    await openai.files.del(fileId);
    
    // Return the classified transactions
    return parsedTransactions as ClassifiedTransaction[];
    
  } catch (error: any) {
    console.error("Error classifying transactions:", error);
    
    // Clean up if file was created
    if (fileId) {
      try {
        await openai.files.del(fileId);
      } catch (err) {
        console.error("Error deleting OpenAI file:", err);
      }
    }
    
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Error deleting temporary file:", err);
      }
    }
    
    // If OpenAI call fails, return transactions with "Uncategorized" category as fallback
    return transactions.map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      category: "Uncategorized"
    }));
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Error deleting temporary file:", err);
      }
    }
  }
}
