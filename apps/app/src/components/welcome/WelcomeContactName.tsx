import { TextInput } from "@ui/components/form-inputs";
import { useState } from "react";

interface WelcomeContactNameProps {
  onComplete?: () => void;
}

/**
 * WelcomeContactName - Step to enter user name
 *
 * Allows user to enter their first and last name,
 * including any variations (such as maiden name).
 */
export function WelcomeContactName({ onComplete }: WelcomeContactNameProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [additionalNames, setAdditionalNames] = useState<string[]>([""]);

  const handleAddName = () => {
    setAdditionalNames([...additionalNames, ""]);
  };

  const handleAdditionalNameChange = (index: number, value: string) => {
    const newNames = [...additionalNames];
    newNames[index] = value;
    setAdditionalNames(newNames);
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="First name"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <TextInput
          label="Last name"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          Additional names (maiden name, nickname, etc.)
        </p>
        {additionalNames.map((name, index) => (
          <TextInput
            key={index}
            placeholder="Additional name"
            value={name}
            onChange={(e) => handleAdditionalNameChange(index, e.target.value)}
          />
        ))}
        {additionalNames.length < 3 && (
          <button
            type="button"
            onClick={handleAddName}
            className="text-sm font-medium text-primary hover:text-primary-600"
          >
            + Add another name
          </button>
        )}
      </div>
    </div>
  );
}
