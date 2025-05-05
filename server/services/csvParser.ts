import fs from 'fs';
import { parse } from 'csv-parse/sync';

type RawTransaction = {
  date: string;
  description: string;
  amount: string;
  [key: string]: string;
};

/**
 * Parse a CSV file and extract transaction data
 * @param filePath Path to the CSV file
 * @returns Array of transactions with date, description, and amount
 */
export async function parseCsvFile(filePath: string): Promise<RawTransaction[]> {
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Process the records to normalize them
    const transactions: RawTransaction[] = [];
    
    for (const record of records) {
      // Identify the column names (might vary across different CSV formats)
      const dateColumn = findColumn(record, ['date', 'transaction_date', 'Date', 'DATE']);
      const descColumn = findColumn(record, ['description', 'memo', 'note', 'Description', 'DESCRIPTION', 'Memo', 'desc']);
      const amountColumn = findColumn(record, ['amount', 'total', 'Amount', 'AMOUNT', 'Total', 'sum']);
      
      if (dateColumn && descColumn && amountColumn) {
        transactions.push({
          date: record[dateColumn],
          description: record[descColumn],
          amount: record[amountColumn],
          // Keep any other columns for reference
          ...record
        });
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to find column names in CSV header
 * @param record The record (row) from CSV
 * @param possibleNames Possible column names to look for
 * @returns The matching column name or undefined
 */
function findColumn(record: Record<string, string>, possibleNames: string[]): string | undefined {
  return Object.keys(record).find(key => 
    possibleNames.some(name => key.toLowerCase().includes(name.toLowerCase()))
  );
}
