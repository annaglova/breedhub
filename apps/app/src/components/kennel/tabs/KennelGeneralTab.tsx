import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { PhoneList, EmailList, SocialList } from "@/components/shared/CommunicationLists";
import { classifyCommunication } from "@/utils/format";
import { dictionaryStore, spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Building2,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SmartLink } from "@/components/shared/SmartLink";

interface KennelGeneralTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig[];
}

/**
 * KennelGeneralTab - Kennel general information
 *
 * Data sources:
 * 1. Country, City — from selectedEntity.country_id / city_id via dictionaryStore
 * 2. Owner — from selectedEntity.owner_name (denormalized)
 * 3. Federation — from selectedEntity.federation_name (denormalized)
 * 4. Phone, Email, Social — dataSource[0] → account_communication, classified by regex
 *
 * Based on Angular: kennel-info.component.ts
 */
export function KennelGeneralTab({ onLoadedCount, dataSource }: KennelGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const accountId = selectedEntity?.id;
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

  // 2. Owner from owner_id (contact entity)
  const [owner, setOwner] = useState<{ name: string; slug?: string } | null>(null);
  const federationName = (selectedEntity?.federation_name as string) || "";

  useEffect(() => {
    const ownerId = selectedEntity?.owner_id as string | undefined;
    if (ownerId) {
      dictionaryStore.getRecordById("contact", ownerId).then((record: Record<string, unknown> | null) => {
        if (record) {
          setOwner({ name: String(record.name || ""), slug: record.slug ? String(record.slug) : undefined });
        } else {
          // Fallback to denormalized name
          setOwner(selectedEntity?.owner_name ? { name: String(selectedEntity.owner_name) } : null);
        }
      });
    } else {
      setOwner(selectedEntity?.owner_name ? { name: String(selectedEntity.owner_name) } : null);
    }
  }, [selectedEntity?.owner_id]);

  // 3. Communications (phone, email, social) from child table
  const { data: communicationsRaw } = useTabData({
    parentId: accountId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!accountId,
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
    }

    return { phoneNumbers: phones, emails: mails, facebookLinks: fb, instagramLinks: ig };
  }, [communicationsRaw]);

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
          {/* Owner, Federation */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<User size={iconSize} />} label="Owner">
              {owner?.slug ? (
                <SmartLink to={`/${owner.slug}`}>{owner.name}</SmartLink>
              ) : (
                <span>{owner?.name || "—"}</span>
              )}
            </InfoRow>
            <InfoRow icon={<Globe size={iconSize} />} label="Federation">
              <span>{federationName || "—"}</span>
            </InfoRow>
          </div>

          {/* Country, City */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{countryName || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <span>{cityName || "—"}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Contact */}
      <Fieldset legend="Contact">
        <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2">
          <InfoRow icon={<Phone size={iconSize} />} label="Phone">
            <PhoneList values={phoneNumbers} />
          </InfoRow>
          <InfoRow icon={<Mail size={iconSize} />} label="Email">
            <EmailList values={emails} />
          </InfoRow>
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
    </div>
  );
}
