import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  AlternatingTimeline,
} from "@ui/components/timeline";
import {
  Building2,
  Check,
  Crown,
  Gift,
  GitMerge,
  Globe,
  Image,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

/**
 * Quest step definition
 */
interface QuestStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  color: string;
  dialogComponent?: React.ReactNode;
  imageUrl?: string;
}

/**
 * WelcomePage - Onboarding quest timeline
 *
 * Shows a timeline of steps the user needs to complete
 * to set up their account and kennel.
 */
export function WelcomePage() {
  // Dialog state
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // TODO: Fetch actual completion status from user data
  // For now, mock data
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(["enter_kennel_name"])
  );

  // Quest steps configuration
  const questSteps: QuestStep[] = useMemo(
    () => [
      {
        id: "enter_kennel_name",
        title: "Enter Kennel name",
        description: "Choose a unique name for your kennel that represents your breeding program",
        icon: <Building2 className="h-4 w-4" />,
        completed: completedSteps.has("enter_kennel_name"),
        color: "primary",
      },
      {
        id: "verify_kennel",
        title: "Verify kennel",
        description: "Verify your kennel ownership to unlock premium features and build trust",
        icon: <ShieldCheck className="h-4 w-4" />,
        completed: completedSteps.has("verify_kennel"),
        color: "success",
      },
      {
        id: "enter_user_name",
        title: "Enter your name",
        description: "Add your personal information so other breeders can connect with you",
        icon: <User className="h-4 w-4" />,
        completed: completedSteps.has("enter_user_name"),
        color: "primary",
      },
      {
        id: "merge_duplicates",
        title: "Merge duplicate data",
        description: "Clean up your database by merging duplicate pet records",
        icon: <GitMerge className="h-4 w-4" />,
        completed: completedSteps.has("merge_duplicates"),
        color: "warning",
      },
      {
        id: "default_settings",
        title: "Set default settings",
        description: "Configure your preferences for the best experience",
        icon: <Settings className="h-4 w-4" />,
        completed: completedSteps.has("default_settings"),
        color: "primary",
      },
      {
        id: "share_referral",
        title: "Share referral link",
        description: "Invite friends and earn rewards when they join",
        icon: <Gift className="h-4 w-4" />,
        completed: completedSteps.has("share_referral"),
        color: "accent",
      },
      {
        id: "select_tier",
        title: "Select tier",
        description: "Choose the subscription plan that fits your needs",
        icon: <Crown className="h-4 w-4" />,
        completed: completedSteps.has("select_tier"),
        color: "warning",
      },
      {
        id: "customize_cover",
        title: "Customize cover",
        description: "Upload a beautiful cover image for your kennel page",
        icon: <Image className="h-4 w-4" />,
        completed: completedSteps.has("customize_cover"),
        color: "primary",
      },
      {
        id: "publish_site",
        title: "Publish site",
        description: "Make your kennel page public and start attracting visitors",
        icon: <Globe className="h-4 w-4" />,
        completed: completedSteps.has("publish_site"),
        color: "success",
      },
    ],
    [completedSteps]
  );

  // Calculate progress
  const completedCount = questSteps.filter((s) => s.completed).length;
  const totalCount = questSteps.length;

  // Convert to timeline format
  const timelineItems = useMemo(
    () =>
      questSteps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        icon: step.completed ? <Check className="h-4 w-4" /> : step.icon,
        variant: step.completed ? ("success" as const) : ("inactive" as const),
        content: (
          <Button
            variant={step.completed ? "ghost" : "outline"}
            size="sm"
            className="mt-2"
            onClick={() => setActiveStepId(step.id)}
          >
            {step.completed ? "View" : "Start"}
          </Button>
        ),
      })),
    [questSteps]
  );

  // Handle step completion (mock)
  const handleCompleteStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
    setActiveStepId(null);
  }, []);

  // Get active step
  const activeStep = questSteps.find((s) => s.id === activeStepId);

  return (
    <ContentPageLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-muted-foreground">
          Complete these steps to set up your account
        </p>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-secondary-200 dark:bg-secondary-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount} of {totalCount} completed
          </span>
        </div>
      </div>

      {/* Timeline */}
      <AlternatingTimeline
        items={timelineItems}
        layout="alternating"
        showCards
        animated
        connectorVariant="primary"
      />

      {/* Step Dialog */}
      <Dialog open={!!activeStepId} onOpenChange={(open) => !open && setActiveStepId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeStep?.icon}
              {activeStep?.title}
            </DialogTitle>
            <DialogDescription>{activeStep?.description}</DialogDescription>
          </DialogHeader>

          {/* Step-specific content will go here */}
          <div className="py-4">
            <div className="bg-secondary-100 dark:bg-secondary-900 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                Step content for "{activeStep?.title}" will be implemented here
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveStepId(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => activeStepId && handleCompleteStep(activeStepId)}
            >
              {activeStep?.completed ? "Done" : "Complete Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  );
}
