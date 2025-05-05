import { useState } from "react";
import { useChat } from "@/lib/chat-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, Edit, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Category color mapping
const categoryColors: Record<string, string> = {
  "Employee Salary": "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
  "Contractor Payment": "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
  "Tax Payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100",
  "Benefits & Insurance": "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100",
  "Bonuses": "bg-pink-100 text-pink-800 dark:bg-pink-800 dark:text-pink-100",
  "Reimbursements": "bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100",
  "Other Payroll Expense": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  "Uncategorized": "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
};

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ isOpen, onClose }: TransactionDetailModalProps) {
  const { transactions } = useChat();
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const pageSize = 10;
  const pageCount = Math.ceil(transactions.length / pageSize);
  
  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn as keyof typeof a];
    const bValue = b[sortColumn as keyof typeof b];
    
    // Handle numeric values (amount)
    if (sortColumn === 'amount') {
      const aNum = parseFloat(String(aValue).replace(/[^0-9.-]+/g, ""));
      const bNum = parseFloat(String(bValue).replace(/[^0-9.-]+/g, ""));
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // Handle string values
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Get current page transactions
  const currentTransactions = sortedTransactions.slice(
    page * pageSize,
    (page + 1) * pageSize
  );
  
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const nextPage = () => {
    if (page < pageCount - 1) {
      setPage(page + 1);
    }
  };
  
  const prevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numAmount)) return amount;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Transaction Classification Details
          </DialogTitle>
          <DialogDescription>
            Review and edit the classifications before exporting to QuickBooks
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border dark:border-gray-700 rounded-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sortColumn === 'date' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      Description
                      {sortColumn === 'description' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      {sortColumn === 'amount' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category
                      {sortColumn === 'category' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">{transaction.date}</TableCell>
                    <TableCell className="whitespace-nowrap">{transaction.description}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge className={categoryColors[transaction.category] || "bg-gray-100 text-gray-800"}>
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-primary">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {currentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No transactions available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {pageCount > 1 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevPage}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {pageCount}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextPage}
                disabled={page >= pageCount - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="default" 
            className="bg-primary text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Export to QuickBooks
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
