import { FileInput } from "@ui/components/form-inputs";
import { useState } from "react";

interface WelcomeKennelVerificationProps {
  onComplete?: () => void;
}

/**
 * WelcomeKennelVerification - Step to verify kennel ownership
 *
 * Allows user to upload a document to verify kennel ownership.
 */
export function WelcomeKennelVerification({
  onComplete,
}: WelcomeKennelVerificationProps) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex flex-col space-y-4">
      <FileInput
        label="Upload verification document"
        helperText="Upload a document to verify that you own this kennel"
        accept="image/*,.pdf"
        value={file}
        onValueChange={(files) => setFile(files as File | null)}
        maxSize={10 * 1024 * 1024} // 10MB
      />
    </div>
  );
}
