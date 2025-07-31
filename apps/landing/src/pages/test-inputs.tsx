import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  emailValidator,
  simplePasswordValidator,
  requiredString,
  optionalString,
  createEnumValidator
} from "@shared/utils/validation";

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

// Define validation schema
const testFormSchema = z.object({
  text: requiredString("Full name"),
  email: emailValidator,
  password: simplePasswordValidator,
  number: z.string()
    .min(1, "Number is required")
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) >= 5, "Number must be at least 5")
    .refine((val) => parseFloat(val) <= 10, "Number must be at most 10"),
  country: requiredString("Country"),
  breed: requiredString("Breed"),
  date: z.date().nullable().optional(),
  description: optionalString,
  file: z.instanceof(File).nullable().optional(),
  agree: z.boolean().refine((val) => val === true, "You must agree to the terms"),
  gender: optionalString,
  time: optionalString,
  notifications: z.boolean()
});

type TestFormData = z.infer<typeof testFormSchema>;

export default function TestInputsPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    setValue,
    watch,
    control
  } = useForm<TestFormData>({
    resolver: zodResolver(testFormSchema),
    mode: "onTouched", // Validate on blur
    defaultValues: {
      text: "",
      email: "",
      password: "",
      number: "5",
      country: "",
      breed: "",
      date: null,
      description: "",
      file: null,
      agree: false,
      gender: "",
      time: "",
      notifications: false,
    }
  });

  const onSubmit = (data: TestFormData) => {
    alert("Form submitted successfully!");
    console.log("Form data:", data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Form Inputs Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Text Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Text Input</h3>
              <TextInput
                label="Full Name"
                placeholder="Enter your full name"
                {...register("text")}
                error={errors.text?.message}
                touched={touchedFields.text}
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
                {...register("email")}
                error={errors.email?.message}
                touched={touchedFields.email}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Password Input</h3>
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                {...register("password")}
                error={errors.password?.message}
                touched={touchedFields.password}
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
                {...register("number")}
                error={errors.number?.message}
                touched={touchedFields.number}
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
                value={watch("country")}
                onValueChange={(value) => setValue("country", value, { shouldValidate: true })}
                error={errors.country?.message}
                touched={touchedFields.country}
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
                value={watch("breed")}
                onValueChange={(value) => setValue("breed", value, { shouldValidate: true })}
                error={errors.breed?.message}
                touched={touchedFields.breed}
                required
              />
            </div>

            {/* Date Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Date Input</h3>
              <DateInput
                label="Birth Date"
                value={watch("date")}
                onValueChange={(date) => setValue("date", date)}
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
                {...register("description")}
                error={errors.description?.message}
                touched={touchedFields.description}
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
                value={watch("file")}
                onValueChange={(file) => setValue("file", file)}
                accept="image/*"
                maxSize={5 * 1024 * 1024} // 5MB
                showPreview
                error={errors.file?.message}
              />
            </div>

            {/* Checkbox Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Checkbox Input</h3>
              <CheckboxInput
                checked={watch("agree")}
                onCheckedChange={(checked) => setValue("agree", checked, { shouldValidate: true })}
                checkboxLabel="I agree to the terms and conditions"
                required
                error={errors.agree?.message}
              />
            </div>

            {/* Radio Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Radio Input</h3>
              <RadioInput
                label="Select Gender"
                value={watch("gender")}
                onValueChange={(value) => setValue("gender", value, { shouldValidate: true })}
                options={[
                  { value: "male", label: "Male", description: "For male dogs" },
                  { value: "female", label: "Female", description: "For female dogs" },
                  { value: "other", label: "Other / Not specified" },
                ]}
                required
                error={errors.gender?.message}
              />
            </div>

            {/* Time Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Time Input</h3>
              <TimeInput
                label="Feeding Time"
                value={watch("time")}
                onValueChange={(time) => setValue("time", time)}
                placeholder="Select time"
                step={15} // 15 minute intervals
                error={errors.time?.message}
              />
            </div>

            {/* Switch Input */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Switch Input</h3>
              <SwitchInput
                label="Notification Settings"
                checked={watch("notifications")}
                onCheckedChange={(checked) => setValue("notifications", checked)}
                switchLabel="Email notifications"
                description="Receive email updates about your dog's activities"
                error={errors.notifications?.message}
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
            <pre className="text-sm">{JSON.stringify(watch(), null, 2)}</pre>
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