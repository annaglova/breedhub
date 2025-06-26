import type { FC, SVGProps } from "react";
import * as icons from "../icons";

type IconComponent = FC<SVGProps<SVGSVGElement>>;
const iconMap = icons as Record<string, IconComponent>;

export interface IconProps extends SVGProps<SVGSVGElement> {
  icon: string;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  icon,
  size = 24,
  className,
  ...props
}) => {
  const toExportName = (path: string) =>
    path
      .split(/[-_/]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("") + "Icon";
  const exportName = toExportName(icon);
  const SvgIcon = iconMap[exportName];

  if (!SvgIcon) {
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
