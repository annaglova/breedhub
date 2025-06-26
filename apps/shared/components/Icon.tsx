// shared/icons/Icon.tsx

import * as icons from "../icons";

type IconProps = {
  icon: string; // наприклад: 'features/bug_report' або 'menu/settings'
  size?: number | string;
  className?: string;
  [key: string]: any;
};

// Функція для створення імені експорту з шляху
function toExportName(path: string) {
  // features/bug_report -> FeaturesBugReportIcon
  return (
    path
      .split(/[\/_-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("") + "Icon"
  );
}

export const Icon: React.FC<IconProps> = ({
  icon,
  size = 24,
  className = "",
  ...props
}) => {
  const exportName = toExportName(icon);
  const SvgIcon = (icons as any)[exportName];

  if (!SvgIcon) {
    // Можна повернути дефолтну іконку або null
    return <span style={{ color: "red" }}>Icon not found: {exportName}</span>;
  }

  return (
    <SvgIcon
      width={size}
      height={size}
      className={className}
      {...props}
      aria-label={icon}
    />
  );
};
