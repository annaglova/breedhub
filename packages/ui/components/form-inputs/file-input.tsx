import { cn } from "@ui/lib/utils";
import { File, FileText, Image, Upload, X } from "lucide-react";
import React, { forwardRef, useRef, useState } from "react";
import { FormField } from "../form-field";

interface FileInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  value?: File | File[] | null;
  onValueChange?: (files: File | File[] | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  showPreview?: boolean;
  fieldClassName?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (file: File) => {
  if (file.type.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (file.type.includes("pdf") || file.type.includes("document"))
    return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      value,
      onValueChange,
      accept,
      multiple = false,
      maxSize,
      maxFiles = 10,
      showPreview = true,
      className,
      fieldClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const files = Array.isArray(value) ? value : value ? [value] : [];

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const validateFiles = (fileList: FileList): File[] => {
      const validFiles: File[] = [];
      let error: string | null = null;

      const filesArray = Array.from(fileList);

      // Check max files
      if (multiple && filesArray.length > maxFiles) {
        error = `Maximum ${maxFiles} files allowed`;
        setValidationError(error);
        return [];
      }

      for (const file of filesArray) {
        // Check file size
        if (maxSize && file.size > maxSize) {
          error = `File "${file.name}" exceeds maximum size of ${formatFileSize(
            maxSize
          )}`;
          break;
        }
        validFiles.push(file);
      }

      setValidationError(error);
      return error ? [] : validFiles;
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (
        disabled ||
        !e.dataTransfer.files ||
        e.dataTransfer.files.length === 0
      ) {
        return;
      }

      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        onValueChange?.(multiple ? validFiles : validFiles[0]);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }

      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        onValueChange?.(multiple ? validFiles : validFiles[0]);
      }
    };

    const handleRemove = (index: number) => {
      if (multiple) {
        const newFiles = files.filter((_, i) => i !== index);
        onValueChange?.(newFiles.length > 0 ? newFiles : null);
      } else {
        onValueChange?.(null);
      }
      setValidationError(null);
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const fileInputElement = (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          {...props}
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 p-6 text-center transition-colors",
            "hover:border-primary-500 hover:bg-slate-50",
            dragActive && "border-primary-500 bg-primary-50",
            disabled && "cursor-not-allowed opacity-50",
            (error || validationError) && "border-red-500 hover:border-red-500",
            className
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-base  text-slate-700">
            {dragActive
              ? "Drop files here"
              : "Drop files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {accept && `Accepts: ${accept}`}
            {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
            {multiple && maxFiles && ` • Max files: ${maxFiles}`}
          </p>
        </div>

        {showPreview && files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-slate-500">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base  text-slate-700 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    className="ml-4 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (label || error || validationError || helperText) {
      return (
        <FormField
          label={label}
          error={error || validationError || undefined}
          helperText={!(error || validationError) ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {fileInputElement}
        </FormField>
      );
    }

    return fileInputElement;
  }
);

FileInput.displayName = "FileInput";
