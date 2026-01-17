import { SwitchInput, TextInput } from "@ui/components/form-inputs";
import { useState } from "react";

interface WelcomeKennelNameProps {
  onComplete?: () => void;
}

/**
 * WelcomeKennelName - Step to enter kennel name
 *
 * Allows user to indicate if they have a registered kennel
 * and enter the kennel name.
 */
export function WelcomeKennelName({ onComplete }: WelcomeKennelNameProps) {
  const [hasKennel, setHasKennel] = useState(false);
  const [kennelName, setKennelName] = useState("");

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-4">
        <span className="text-base">Do you have a registered kennel name?</span>
        <SwitchInput
          checked={hasKennel}
          onCheckedChange={setHasKennel}
          switchLabel={hasKennel ? "Yes" : "No"}
        />
      </div>

      <TextInput
        label="Enter your kennel name"
        placeholder="Kennel name"
        value={kennelName}
        onChange={(e) => setKennelName(e.target.value)}
        disabled={!hasKennel}
      />
    </div>
  );
}
