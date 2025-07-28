import { useState } from "react";
import {
  NumberInput,
  TextInput,
  EmailInput,
  PasswordInput,
  DropdownInput,
  LookupInput,
  DateInput,
  TextareaInput,
  FileInput,
  CheckboxInput,
  RadioInput,
  TimeInput,
  SwitchInput,
} from "@ui/components/form-inputs";
import { User, Pencil } from "lucide-react";

const countryOptions = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ua", label: "Ukraine" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
];

const dogBreedOptions = [
  { value: "golden", label: "Golden Retriever", description: "Friendly and intelligent" },
  { value: "german", label: "German Shepherd", description: "Loyal and versatile" },
  { value: "bulldog", label: "Bulldog", description: "Gentle and courageous" },
  { value: "poodle", label: "Poodle", description: "Active and intelligent" },
  { value: "beagle", label: "Beagle", description: "Curious and friendly" },
  { value: "rottweiler", label: "Rottweiler", description: "Confident guardian" },
  { value: "yorkshire", label: "Yorkshire Terrier", description: "Affectionate and sprightly" },
  { value: "dachshund", label: "Dachshund", description: "Curious and lively" },
  { value: "siberian", label: "Siberian Husky", description: "Outgoing and energetic" },
  { value: "boxer", label: "Boxer", description: "Fun-loving and loyal" },
];

export default function TestInputsPage() {
  const [formData, setFormData] = useState({
    text: "",
    email: "",
    password: "",
    number: "5",
    country: "",
    breed: "",
    date: null as Date | null,
    description: "",
    file: null as File | null,
    agree: false,
    gender: "",
    time: "",
    notifications: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.text) newErrors.text = "Text field is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (!formData.number) newErrors.number = "Number is required";
    else if (parseFloat(formData.number) < 5) newErrors.number = "Number must be at least 5";
    else if (parseFloat(formData.number) > 10) newErrors.number = "Number must be at most 10";
    if (!formData.country) newErrors.country = "Please select a country";
    if (!formData.breed) newErrors.breed = "Please select a breed";
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      alert("Form submitted successfully!");
      console.log("Form data:", formData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Form Inputs Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Text Input</h3>
              <TextInput
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                error={errors.text}
                required
                icon={<User className="h-4 w-4" />}
              />
            </div>

            {/* Email Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Email Input</h3>
              <EmailInput
                label="Email Address"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Password Input</h3>
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                required
                showStrengthIndicator
              />
            </div>

            {/* Number Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Number Input</h3>
              <NumberInput
                id="age-input"
                label="Age"
                placeholder="Enter your age"
                helperText="Please enter your age in years (5-10)"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                error={errors.number}
                required
                min={5}
                max={10}
              />
            </div>

            {/* Dropdown Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Dropdown Input</h3>
              <DropdownInput
                label="Country"
                placeholder="Select your country"
                options={countryOptions}
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
                error={errors.country}
                required
              />
            </div>

            {/* Lookup Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Lookup Input (with search)</h3>
              <LookupInput
                label="Dog Breed"
                placeholder="Search for a breed..."
                options={dogBreedOptions}
                value={formData.breed}
                onValueChange={(value) => setFormData({ ...formData, breed: value })}
                error={errors.breed}
                required
              />
            </div>

            {/* Date Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Date Input</h3>
              <DateInput
                label="Birth Date"
                value={formData.date}
                onValueChange={(date) => setFormData({ ...formData, date })}
                minDate={new Date(2020, 0, 1)}
                maxDate={new Date()}
                placeholder="Select a date"
              />
            </div>

            {/* Textarea Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Textarea Input</h3>
              <TextareaInput
                label="Description"
                placeholder="Tell us about your dog..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                showCharCount
                maxChars={200}
                rows={4}
              />
            </div>

            {/* File Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">File Input</h3>
              <FileInput
                label="Upload Photo"
                value={formData.file}
                onValueChange={(file) => setFormData({ ...formData, file })}
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
                showPreview
              />
            </div>

            {/* Checkbox Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Checkbox Input</h3>
              <CheckboxInput
                checked={formData.agree}
                onCheckedChange={(checked) => setFormData({ ...formData, agree: checked })}
                checkboxLabel="I agree to the terms and conditions"
                required
              />
            </div>

            {/* Radio Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Radio Input</h3>
              <RadioInput
                label="Select Gender"
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                options={[
                  { value: "male", label: "Male", description: "For male dogs" },
                  { value: "female", label: "Female", description: "For female dogs" },
                  { value: "other", label: "Other / Not specified" },
                ]}
                required
              />
            </div>

            {/* Time Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Time Input</h3>
              <TimeInput
                label="Feeding Time"
                value={formData.time}
                onValueChange={(time) => setFormData({ ...formData, time })}
                placeholder="Select time"
                step={15} // 15 minute intervals
              />
            </div>

            {/* Switch Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Switch Input</h3>
              <SwitchInput
                label="Notification Settings"
                checked={formData.notifications}
                onCheckedChange={(checked) => setFormData({ ...formData, notifications: checked })}
                switchLabel="Email notifications"
                description="Receive email updates about your dog's activities"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-md hover:bg-primary-600 transition-colors font-medium"
              >
                Submit Form
              </button>
            </div>
          </form>

          {/* Form Data Display */}
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Form Data:</h3>
            <pre className="text-sm">{JSON.stringify(formData, null, 2)}</pre>
          </div>
        </div>

        {/* Examples without labels */}
        <div className="bg-white rounded-lg shadow-md p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Inputs without labels</h2>
          
          <div className="space-y-4">
            <TextInput
              placeholder="Text input without label"
              icon={<Pencil className="h-4 w-4" />}
            />
            
            <EmailInput
              placeholder="Email without label"
            />
            
            <PasswordInput
              placeholder="Password without label"
              showStrengthIndicator
            />
            
            <NumberInput
              placeholder="Price"
              prefix="$"
              min={0}
              step={0.01}
            />
            
            <DropdownInput
              placeholder="Select option"
              options={countryOptions}
            />
            
            <LookupInput
              placeholder="Search breeds..."
              options={dogBreedOptions}
            />
            
            <DateInput
              placeholder="Select date"
            />
            
            <TimeInput
              placeholder="Select time"
              use24Hour
            />
            
            <TextareaInput
              placeholder="Enter your message..."
              rows={3}
            />
            
            <FileInput
              accept=".pdf,.doc,.docx"
              multiple
              maxFiles={3}
            />
            
            <CheckboxInput
              checkboxLabel="Subscribe to newsletter"
            />
            
            <RadioInput
              options={[
                { value: "option1", label: "Option 1" },
                { value: "option2", label: "Option 2" },
                { value: "option3", label: "Option 3" },
              ]}
              orientation="horizontal"
            />
            
            <SwitchInput
              switchLabel="Enable feature"
            />
          </div>
        </div>
      </div>
    </div>
  );
}