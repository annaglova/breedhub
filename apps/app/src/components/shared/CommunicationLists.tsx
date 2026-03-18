/**
 * Communication display components - phone, email, social links.
 * Used by ContactGeneralTab and KennelGeneralTab.
 */
import { ExternalLink } from "lucide-react";
import { extractSocialHandle } from "@/utils/format";

function ensureUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function BulletList({ children }: { children: React.ReactNode[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      {children.map((child, i) => (
        <div key={i} className="flex items-center gap-x-1">
          {i > 0 && <span className="text-secondary-400">&bull;</span>}
          {child}
        </div>
      ))}
    </div>
  );
}

export function PhoneList({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <BulletList>
      {values.map((phone) => (
        <a key={phone} href={`tel:${phone.replace(/[\s\-().]/g, "")}`} className="hover:text-primary transition-colors">
          {phone}
        </a>
      ))}
    </BulletList>
  );
}

export function EmailList({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <BulletList>
      {values.map((email) => (
        <a key={email} href={`mailto:${email}`} className="hover:text-primary transition-colors">
          {email}
        </a>
      ))}
    </BulletList>
  );
}

export function SocialList({ values, platform }: { values: string[]; platform: "facebook" | "instagram" }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <BulletList>
      {values.map((url) => (
        <a
          key={url}
          href={ensureUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          {extractSocialHandle(url, platform)}
          <ExternalLink size={12} className="text-muted-foreground" />
        </a>
      ))}
    </BulletList>
  );
}
