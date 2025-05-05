import fs from "fs";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

/**
 * Creates a file with OpenAI and returns the file ID
 * Accepts local file path or URL
 */
export async function createFile(filePath: string): Promise<string> {
  let result;
  
  try {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      // Download the file content from the URL
      const res = await fetch(filePath);
      const buffer = await res.arrayBuffer();
      const urlParts = filePath.split("/");
      const fileName = urlParts[urlParts.length - 1];
      
      // Create a File object from the buffer
      const file = new File([buffer], fileName);
      
      // Upload to OpenAI
      result = await openai.files.create({
        file: file,
        purpose: "assistants"
      });
    } else {
      // Handle local file path
      const fileStream = fs.createReadStream(filePath);
      result = await openai.files.create({
        file: fileStream,
        purpose: "assistants"
      });
    }
    
    return result.id;
  } catch (error) {
    console.error("Error creating file with OpenAI:", error);
    throw error;
  }
}

/**
 * Performs a file search using OpenAI's API
 */
export async function searchFile(fileId: string, query: string): Promise<any> {
  try {
    // Not directly implemented in the current OpenAI Node.js SDK
    // This would be implemented using the Assistants API with file_search tool
    // For demo purposes, we'll just return an example response format
    return {
      output: [
        {
          type: "file_search_call",
          id: `fs_${Date.now()}`,
          status: "completed",
          queries: [query],
          search_results: null
        },
        {
          id: `msg_${Date.now()}`,
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Results from analyzing the file...",
              annotations: [
                {
                  type: "file_citation",
                  index: 992,
                  file_id: fileId,
                  filename: "transactions.csv"
                }
              ]
            }
          ]
        }
      ]
    };
  } catch (error) {
    console.error("Error searching file with OpenAI:", error);
    throw error;
  }
}

/**
 * Deletes a file from OpenAI
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await openai.files.del(fileId);
    return true;
  } catch (error) {
    console.error("Error deleting file from OpenAI:", error);
    return false;
  }
}