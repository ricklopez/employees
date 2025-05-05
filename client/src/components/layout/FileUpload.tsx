import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export default function FileUpload({ onFileUpload }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        onFileUpload(file);
      } else {
        alert("Please upload a CSV file");
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : isDragReject
          ? "border-destructive bg-destructive/5"
          : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-primary mb-3" />
      <p className="mb-2 font-medium">Drag and drop your CSV file here</p>
      <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
      <Button 
        type="button" 
        variant="outline" 
        className="bg-primary/10 text-primary hover:bg-primary/20 font-medium"
      >
        Select File
      </Button>

      {isDragReject && (
        <p className="mt-3 text-sm text-destructive">Only CSV files are accepted</p>
      )}
    </div>
  );
}
