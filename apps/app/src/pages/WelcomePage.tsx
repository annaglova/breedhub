import {
  WelcomeContactName,
  WelcomeCover,
  WelcomeKennelName,
  WelcomeKennelVerification,
  WelcomeMerge,
  WelcomeReferral,
  WelcomeSettings,
  WelcomeSite,
  WelcomeTierSelection,
} from "@/components/welcome";
import { useTheme } from "@/hooks/useTheme";
import { ContentPageLayout } from "@/layouts/ContentPageLayout";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { MajorPoint } from "@ui/components/major-point";
import { AlternatingTimeline } from "@ui/components/timeline";
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
  image: string;
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
  const { theme } = useTheme();

  // TODO: Fetch actual completion status from user data
  // For now, mock data
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(["enter_kennel_name", "verify_kennel", "enter_user_name"])
  );

  // Quest steps configuration with detailed descriptions from original design
  const questSteps: QuestStep[] = useMemo(
    () => [
      {
        id: "enter_kennel_name",
        title: "Enter your kennel name",
        description:
          "Enter your kennel name so we can link your account to the correct kennel in our system.",
        icon: <Building2 className="h-4 w-4" />,
        completed: completedSteps.has("enter_kennel_name"),
        color: "primary",
        image: "kennel.png",
      },
      {
        id: "verify_kennel",
        title: "Verify your kennel",
        description:
          "Upload a document to verify that you own this kennel. Until verified, any user can edit data on your pages (pets, kennel, contact). After verification, only you can modify your public data.",
        icon: <ShieldCheck className="h-4 w-4" />,
        completed: completedSteps.has("verify_kennel"),
        color: "success",
        image: "verify.png",
      },
      {
        id: "enter_user_name",
        title: "Enter your name",
        description:
          "Enter your first and last name, including any variations (such as your maiden name). This helps us identify potential duplicates and make your account as complete as possible.",
        icon: <User className="h-4 w-4" />,
        completed: completedSteps.has("enter_user_name"),
        color: "primary",
        image: "user.png",
      },
      {
        id: "merge_duplicates",
        title: "Merge duplicate data",
        description:
          "Based on the information you provided, we've identified potential duplicate records. Select the duplicates you want to merge into a single account.",
        icon: <GitMerge className="h-4 w-4" />,
        completed: completedSteps.has("merge_duplicates"),
        color: "warning",
        image: "merge.png",
      },
      {
        id: "default_settings",
        title: "Set default settings",
        description:
          "Customize your account preferences to personalize your Breedhub experience. Configure how data is displayed to suit your needs.",
        icon: <Settings className="h-4 w-4" />,
        completed: completedSteps.has("default_settings"),
        color: "primary",
        image: "settings.png",
      },
      {
        id: "share_referral",
        title: "Share your referral link",
        description:
          "Invite friends to join Breedhub through our referral program. Earn points for each referred user who subscribes, and redeem them for premium features.",
        icon: <Gift className="h-4 w-4" />,
        completed: completedSteps.has("share_referral"),
        color: "accent",
        image: "gift.png",
      },
      {
        id: "select_tier",
        title: "Select your tier",
        description: "Choose the subscription tier that best fits your needs.",
        icon: <Crown className="h-4 w-4" />,
        completed: completedSteps.has("select_tier"),
        color: "warning",
        image: "tier.png",
      },
      {
        id: "customize_cover",
        title: "Customize your default cover",
        description:
          "Customize your default cover to make your public pages stand out. Design a unique look and add the features you need.",
        icon: <Image className="h-4 w-4" />,
        completed: completedSteps.has("customize_cover"),
        color: "primary",
        image: "cover.png",
      },
      {
        id: "publish_site",
        title: "Publish your site",
        description:
          "Choose a domain name for your kennel website. Publish your site for the first time and continue customizing it to your liking.",
        icon: <Globe className="h-4 w-4" />,
        completed: completedSteps.has("publish_site"),
        color: "success",
        image: "globe.png",
      },
    ],
    [completedSteps]
  );

  // Calculate progress
  const completedCount = questSteps.filter((s) => s.completed).length;
  const totalCount = questSteps.length;

  // Convert to timeline format with custom card content
  // Alternate image position: left cards have image on left (outside), right cards have image on right (outside)
  const timelineItems = useMemo(
    () =>
      questSteps.map((step, index) => {
        const isLeftSide = index % 2 === 0;

        return {
          id: step.id,
          title: "",
          icon: step.completed ? <Check className="h-4 w-4" /> : step.icon,
          variant: step.completed
            ? ("success" as const)
            : ("inactive" as const),
          content: (
            <div
              className="group flex w-full flex-col rounded-lg border border-slate-200 bg-white px-6 pb-4 pt-6 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              onClick={() => setActiveStepId(step.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setActiveStepId(step.id)}
            >
              {/* Title - full width header */}
              <h3 className="text-xl font-semibold">{step.title}</h3>

              {/* Content row: text + image */}
              <div
                className={`flex items-center justify-between ${
                  isLeftSide ? "flex-row-reverse" : ""
                }`}
              >
                {/* Text content */}
                <div
                  className={`flex flex-col space-y-2 ${
                    isLeftSide ? "pl-0" : "pr-0"
                  }`}
                >
                  <p className="pt-2 text-secondary-600 dark:text-secondary-400 text-[0.9rem]">
                    {step.description}
                  </p>
                  <div>
                    <button
                      className="text-base font-semibold text-primary hover:bg-primary-50 dark:hover:bg-primary-900/30 px-3 py-1.5 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStepId(step.id);
                      }}
                    >
                      {step.completed ? "View" : "Start"}
                    </button>
                  </div>
                </div>

                {/* Image with scale on hover */}
                <div className="shrink-0">
                  <img
                    src={`/images/welcome/${theme}/${step.image}`}
                    alt={step.title}
                    className="mx-2 size-20 object-contain transition-transform duration-300 group-hover:scale-110 opacity-90"
                  />
                </div>
              </div>
            </div>
          ),
        };
      }),
    [questSteps, theme]
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
        <h1 className="text-2xl font-semibold mb-6">Welcome</h1>

        {/* Hero section with intro and progress */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Intro text */}
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-semibold">Get started with Breedhub</h2>
            <p className="text-secondary-600 dark:text-secondary-400 leading-7 max-w-xl">
              Complete these simple steps to set up your account and get the
              most out of Breedhub.
            </p>
          </div>

          {/* Progress indicator using MajorPoint */}
          <div className="shrink-0">
            <MajorPoint
              name="Completed steps"
              secondaryName={`from ${totalCount}`}
              value={completedCount}
              valueClassName="text-accent"
            />
          </div>
        </div>
      </div>

      {/* Timeline with custom cards */}
      <AlternatingTimeline
        items={timelineItems}
        layout="alternating"
        showCards={false}
        connectorVariant="primary"
      />

      {/* Step Dialog */}
      <Dialog
        open={!!activeStepId}
        onOpenChange={(open) => !open && setActiveStepId(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeStep?.icon}
              {activeStep?.title}
            </DialogTitle>
          </DialogHeader>

          {/* Step-specific content */}
          <div className="py-4">
            <div className="rounded-lg bg-modal-card-ground px-6 py-4">
              {activeStepId === "enter_kennel_name" && <WelcomeKennelName />}
              {activeStepId === "verify_kennel" && <WelcomeKennelVerification />}
              {activeStepId === "enter_user_name" && <WelcomeContactName />}
              {activeStepId === "merge_duplicates" && <WelcomeMerge />}
              {activeStepId === "default_settings" && <WelcomeSettings />}
              {activeStepId === "share_referral" && <WelcomeReferral />}
              {activeStepId === "select_tier" && <WelcomeTierSelection />}
              {activeStepId === "customize_cover" && <WelcomeCover />}
              {activeStepId === "publish_site" && <WelcomeSite />}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setActiveStepId(null)}
              className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => activeStepId && handleCompleteStep(activeStepId)}
              className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900"
            >
              {activeStep?.completed ? "Done" : "Complete step"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  );
}
