import type { ComponentType, SVGProps } from "react";

import PatronPlace1Icon from "@shared/icons/patron-places/place-1.svg?react";
import PatronPlace2Icon from "@shared/icons/patron-places/place-2.svg?react";
import PatronPlace3Icon from "@shared/icons/patron-places/place-3.svg?react";
import PatronPlace4Icon from "@shared/icons/patron-places/place-4.svg?react";
import PatronPlace5Icon from "@shared/icons/patron-places/place-5.svg?react";
import PatronPlace6Icon from "@shared/icons/patron-places/place-6.svg?react";
import PatronPlace7Icon from "@shared/icons/patron-places/place-7.svg?react";
import PatronPlace8Icon from "@shared/icons/patron-places/place-8.svg?react";
import PatronPlace9Icon from "@shared/icons/patron-places/place-9.svg?react";
import PatronPlace10Icon from "@shared/icons/patron-places/place-10.svg?react";
import PatronPlace11Icon from "@shared/icons/patron-places/place-11.svg?react";
import PatronPlace12Icon from "@shared/icons/patron-places/place-12.svg?react";
import PatronPlace13Icon from "@shared/icons/patron-places/place-13.svg?react";
import PatronPlace14Icon from "@shared/icons/patron-places/place-14.svg?react";
import PatronPlace15Icon from "@shared/icons/patron-places/place-15.svg?react";
import PatronPlace16Icon from "@shared/icons/patron-places/place-16.svg?react";
import PatronPlace17Icon from "@shared/icons/patron-places/place-17.svg?react";
import PatronPlace18Icon from "@shared/icons/patron-places/place-18.svg?react";
import PatronPlace19Icon from "@shared/icons/patron-places/place-19.svg?react";
import PatronPlace20Icon from "@shared/icons/patron-places/place-20.svg?react";

type PatronPlaceIcon = ComponentType<SVGProps<SVGSVGElement>>;

const patronPlaceIconRegistry: Record<string, PatronPlaceIcon> = {
  "place-1": PatronPlace1Icon,
  "place-2": PatronPlace2Icon,
  "place-3": PatronPlace3Icon,
  "place-4": PatronPlace4Icon,
  "place-5": PatronPlace5Icon,
  "place-6": PatronPlace6Icon,
  "place-7": PatronPlace7Icon,
  "place-8": PatronPlace8Icon,
  "place-9": PatronPlace9Icon,
  "place-10": PatronPlace10Icon,
  "place-11": PatronPlace11Icon,
  "place-12": PatronPlace12Icon,
  "place-13": PatronPlace13Icon,
  "place-14": PatronPlace14Icon,
  "place-15": PatronPlace15Icon,
  "place-16": PatronPlace16Icon,
  "place-17": PatronPlace17Icon,
  "place-18": PatronPlace18Icon,
  "place-19": PatronPlace19Icon,
  "place-20": PatronPlace20Icon,
};

export function resolvePatronPlaceIcon(iconName: string): PatronPlaceIcon | null {
  return patronPlaceIconRegistry[iconName] ?? null;
}

export const FirstPatronPlaceIcon = PatronPlace1Icon;
