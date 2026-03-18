import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { PhoneList, EmailList, SocialList } from "@/components/shared/CommunicationLists";
import { classifyCommunication } from "@/utils/format";
import { dictionaryStore, spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig, EnrichedChildItem } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Building2,
  Facebook,
  Instagram,
  Languages,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * LanguageList - Renders a list of languages with bullets
 */
function LanguageList({ languages }: { languages?: string[] }) {
  if (!languages || languages.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap space-x-1">
      <span>{languages[0]}</span>
      {languages.slice(1).map((name, index) => (
        <div key={index} className="flex space-x-1">
          <span className="text-secondary-400">&bull;</span>
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}

interface ContactGeneralTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig[];
}

/**
 * ContactGeneralTab - Contact general information
 *
 * Data sources:
 * 1. Country, City — from selectedEntity.country_id / city_id via dictionaryStore
 * 2. Phone, Email, Social — dataSource[0] → contact_communication, classified by regex
 * 3. Languages — dataSource[1] → contact_language + sys_language (child_with_dictionary)
 *
 * Based on Angular: contact-info.component.ts
 */
export function ContactGeneralTab({ onLoadedCount, dataSource }: ContactGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const contactId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // 1. Country and City from dictionary
  const [countryName, setCountryName] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    const countryId = selectedEntity?.country_id as string | undefined;
    const cityId = selectedEntity?.city_id as string | undefined;

    if (countryId) {
      dictionaryStore.getRecordById("country", countryId).then((record: Record<string, unknown> | null) => {
        setCountryName((record?.name as string) || null);
      });
    } else {
      setCountryName(null);
    }

    if (cityId) {
      dictionaryStore.getRecordById("city", cityId).then((record: Record<string, unknown> | null) => {
        setCityName((record?.name as string) || null);
      });
    } else {
      setCityName(null);
    }
  }, [selectedEntity?.country_id, selectedEntity?.city_id]);

  // 2. Communications (phone, email, social) from child table
  const { data: communicationsRaw } = useTabData({
    parentId: contactId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!contactId,
  });

  // Classify communications into categories
  const { phoneNumbers, emails, facebookLinks, instagramLinks } = useMemo(() => {
    const phones: string[] = [];
    const mails: string[] = [];
    const fb: string[] = [];
    const ig: string[] = [];

    if (!communicationsRaw) return { phoneNumbers: phones, emails: mails, facebookLinks: fb, instagramLinks: ig };

    for (const item of communicationsRaw) {
      const value = (item as any).number || (item as any).additional?.number;
      if (!value || typeof value !== "string") continue;

      const type = classifyCommunication(value.trim());
      if (type === "phone") phones.push(value.trim());
      else if (type === "email") mails.push(value.trim());
      else if (type === "facebook") fb.push(value.trim());
      else if (type === "instagram") ig.push(value.trim());
      // Skip URLs and other garbage
    }

    return { phoneNumbers: phones, emails: mails, facebookLinks: fb, instagramLinks: ig };
  }, [communicationsRaw]);

  // 3. Languages from child_with_dictionary
  const { data: languagesRaw } = useTabData<EnrichedChildItem>({
    parentId: contactId,
    dataSource: dataSource?.[1]!,
    enabled: !!dataSource?.[1] && !!contactId,
  });

  const languages = useMemo<string[]>(() => {
    if (!languagesRaw || languagesRaw.length === 0) return [];
    return languagesRaw
      .map((item: EnrichedChildItem) => item._dictionary?.name as string | undefined)
      .filter((name: string | undefined): name is string => !!name);
  }, [languagesRaw]);

  // Report count after render (always 1 for general info)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(1);
    }
  }, [onLoadedCount]);

  const iconSize = 16;
  const hasSocial = facebookLinks.length > 0 || instagramLinks.length > 0;

  return (
    <div className="flex flex-col space-y-5 cursor-default">
      {/* Info */}
      <Fieldset legend="Info">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "lg:flex-row lg:divide-x divide-border"
          )}
        >
          {/* Country, City */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{countryName || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <span>{cityName || "—"}</span>
            </InfoRow>
          </div>

          {/* Phone, Email */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Phone size={iconSize} />} label="Phone">
              <PhoneList values={phoneNumbers} />
            </InfoRow>
            <InfoRow icon={<Mail size={iconSize} />} label="Email">
              <EmailList values={emails} />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Social network - only show if has data */}
      {hasSocial && (
        <Fieldset legend="Social network">
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2">
            {facebookLinks.length > 0 && (
              <InfoRow icon={<Facebook size={iconSize} />} label="Facebook">
                <SocialList values={facebookLinks} platform="facebook" />
              </InfoRow>
            )}
            {instagramLinks.length > 0 && (
              <InfoRow icon={<Instagram size={iconSize} />} label="Instagram">
                <SocialList values={instagramLinks} platform="instagram" />
              </InfoRow>
            )}
          </div>
        </Fieldset>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Fieldset legend="Languages">
          <div className="flex items-center space-x-5 px-4 pb-2">
            <Languages size={iconSize} className="text-secondary-400" />
            <LanguageList languages={languages} />
          </div>
        </Fieldset>
      )}
    </div>
  );
}
