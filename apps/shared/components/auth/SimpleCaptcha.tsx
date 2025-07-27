import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib/utils";
import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw } from "lucide-react";

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

export function SimpleCaptcha({ onVerify, className }: SimpleCaptchaProps) {
  const [question, setQuestion] = useState({ a: 0, b: 0, answer: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const generateQuestion = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setQuestion({ a, b, answer: a + b });
    setUserAnswer("");
    setError("");
    setIsVerified(false);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleVerify = () => {
    const answer = parseInt(userAnswer);
    if (isNaN(answer)) {
      setError("Please enter a valid number");
      return;
    }

    if (answer === question.answer) {
      setIsVerified(true);
      setError("");
      onVerify(true);
    } else {
      setError("Incorrect answer. Please try again.");
      generateQuestion();
      onVerify(false);
    }
  };

  if (isVerified) {
    return (
      <div className={cn("p-4 bg-green-50 border border-green-200 rounded-lg", className)}>
        <div className="flex items-center text-green-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Verified! You can proceed.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-gray-50 border border-gray-200 rounded-lg", className)}>
      <p className="text-sm font-medium text-gray-700 mb-3">
        Please solve this simple math problem to continue:
      </p>
      <div className="flex items-center gap-3">
        <span className="text-lg font-mono">
          {question.a} + {question.b} =
        </span>
        <Input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className="w-20"
          placeholder="?"
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleVerify}
          variant="outline"
        >
          Verify
        </Button>
        <button
          type="button"
          onClick={generateQuestion}
          className="text-sm text-gray-500 hover:text-gray-700"
          title="Generate new question"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}