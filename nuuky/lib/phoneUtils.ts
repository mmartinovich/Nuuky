import { CountryCode } from "react-native-country-picker-modal";

// Country dial codes (comprehensive ITU-T E.164 list)
export const COUNTRY_DIAL_CODES: Partial<Record<CountryCode, string>> = {
  // North America & Caribbean
  US: "+1",
  CA: "+1",
  AG: "+1268",
  AI: "+1264",
  AS: "+1684",
  BB: "+1246",
  BM: "+1441",
  BS: "+1242",
  DM: "+1767",
  DO: "+1809",
  GD: "+1473",
  GU: "+1671",
  JM: "+1876",
  KN: "+1869",
  KY: "+1345",
  LC: "+1758",
  MS: "+1664",
  PR: "+1787",
  SX: "+1721",
  TC: "+1649",
  TT: "+1868",
  VC: "+1784",
  VG: "+1284",
  VI: "+1340",

  // Central America
  BZ: "+501",
  CR: "+506",
  GT: "+502",
  HN: "+504",
  MX: "+52",
  NI: "+505",
  PA: "+507",
  SV: "+503",

  // South America
  AR: "+54",
  BO: "+591",
  BR: "+55",
  CL: "+56",
  CO: "+57",
  EC: "+593",
  GY: "+592",
  PE: "+51",
  PY: "+595",
  SR: "+597",
  UY: "+598",
  VE: "+58",

  // Western Europe
  GB: "+44",
  IE: "+353",
  FR: "+33",
  DE: "+49",
  AT: "+43",
  CH: "+41",
  BE: "+32",
  NL: "+31",
  LU: "+352",
  LI: "+423",
  MC: "+377",

  // Southern Europe
  ES: "+34",
  PT: "+351",
  IT: "+39",
  GR: "+30",
  MT: "+356",
  AD: "+376",
  SM: "+378",
  VA: "+379",
  GI: "+350",
  CY: "+357",

  // Northern Europe
  SE: "+46",
  NO: "+47",
  DK: "+45",
  FI: "+358",
  IS: "+354",
  FO: "+298",
  GL: "+299",

  // Eastern Europe
  PL: "+48",
  CZ: "+420",
  SK: "+421",
  HU: "+36",
  RO: "+40",
  BG: "+359",
  HR: "+385",
  SI: "+386",
  RS: "+381",
  BA: "+387",
  ME: "+382",
  MK: "+389",
  AL: "+355",
  XK: "+383",

  // Baltic States
  EE: "+372",
  LV: "+371",
  LT: "+370",

  // Eastern Europe & Central Asia
  RU: "+7",
  UA: "+380",
  BY: "+375",
  MD: "+373",
  GE: "+995",
  AM: "+374",
  AZ: "+994",
  KZ: "+7",
  UZ: "+998",
  TM: "+993",
  TJ: "+992",
  KG: "+996",

  // Middle East
  TR: "+90",
  IL: "+972",
  SA: "+966",
  AE: "+971",
  QA: "+974",
  KW: "+965",
  BH: "+973",
  OM: "+968",
  YE: "+967",
  JO: "+962",
  LB: "+961",
  SY: "+963",
  IQ: "+964",
  IR: "+98",
  PS: "+970",

  // South Asia
  IN: "+91",
  PK: "+92",
  BD: "+880",
  LK: "+94",
  NP: "+977",
  BT: "+975",
  MV: "+960",
  AF: "+93",

  // East Asia
  CN: "+86",
  JP: "+81",
  KR: "+82",
  KP: "+850",
  TW: "+886",
  HK: "+852",
  MO: "+853",
  MN: "+976",

  // Southeast Asia
  SG: "+65",
  MY: "+60",
  TH: "+66",
  VN: "+84",
  PH: "+63",
  ID: "+62",
  MM: "+95",
  KH: "+855",
  LA: "+856",
  BN: "+673",
  TL: "+670",

  // Oceania
  AU: "+61",
  NZ: "+64",
  FJ: "+679",
  PG: "+675",
  WS: "+685",
  TO: "+676",
  VU: "+678",
  SB: "+677",
  PW: "+680",
  FM: "+691",
  MH: "+692",
  KI: "+686",
  NR: "+674",
  TV: "+688",
  CK: "+682",
  NU: "+683",

  // North Africa
  EG: "+20",
  MA: "+212",
  DZ: "+213",
  TN: "+216",
  LY: "+218",

  // West Africa
  NG: "+234",
  GH: "+233",
  SN: "+221",
  CI: "+225",
  ML: "+223",
  BF: "+226",
  NE: "+227",
  TG: "+228",
  BJ: "+229",
  MR: "+222",
  GM: "+220",
  GW: "+245",
  GN: "+224",
  SL: "+232",
  LR: "+231",
  CV: "+238",

  // Central Africa
  CM: "+237",
  CD: "+243",
  CG: "+242",
  GA: "+241",
  GQ: "+240",
  CF: "+236",
  TD: "+235",
  ST: "+239",

  // East Africa
  KE: "+254",
  TZ: "+255",
  UG: "+256",
  RW: "+250",
  BI: "+257",
  ET: "+251",
  ER: "+291",
  DJ: "+253",
  SO: "+252",
  SD: "+249",
  SS: "+211",

  // Southern Africa
  ZA: "+27",
  ZW: "+263",
  ZM: "+260",
  MW: "+265",
  MZ: "+258",
  BW: "+267",
  NA: "+264",
  LS: "+266",
  SZ: "+268",
  AO: "+244",
  MG: "+261",
  MU: "+230",
  SC: "+248",
  KM: "+269",
  RE: "+262",
};

export interface PhoneValidation {
  isValid: boolean;
  normalized: string; // E.164 format
  error?: string;
}

/**
 * Get the dial code for a country
 */
export const getDialCode = (countryCode: CountryCode): string => {
  return COUNTRY_DIAL_CODES[countryCode] || "+1";
};

/**
 * Validate phone number and return E.164 format
 */
export const validatePhone = (
  rawNumber: string,
  countryCode: CountryCode
): PhoneValidation => {
  // Remove all non-digits
  let digits = rawNumber.replace(/\D/g, "");

  // Empty check
  if (!digits || digits.length === 0) {
    return { isValid: false, normalized: "", error: "Phone number is required" };
  }

  // Strip leading 0 for countries that use it in national format
  // Most countries (except US, CA, and a few others) use leading 0 nationally
  const countriesWithoutLeadingZero = ["US", "CA", "DO", "PR"];
  if (!countriesWithoutLeadingZero.includes(countryCode) && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Minimum length check (most countries have at least 7 digits after stripping leading 0)
  if (digits.length < 7) {
    return { isValid: false, normalized: "", error: "Phone number is too short" };
  }

  // Maximum length check (E.164 allows up to 15 digits total)
  if (digits.length > 15) {
    return { isValid: false, normalized: "", error: "Phone number is too long" };
  }

  // Build E.164 format
  const dialCode = getDialCode(countryCode);
  const normalized = `${dialCode}${digits}`;

  return { isValid: true, normalized, error: undefined };
};

/**
 * Format phone number for display (US format as default)
 */
export const formatPhoneDisplay = (digits: string, countryCode: CountryCode = "US"): string => {
  if (!digits) return "";

  // US/CA format: (XXX) XXX-XXXX
  if (countryCode === "US" || countryCode === "CA") {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // UK format: XXXX XXX XXXX
  if (countryCode === "GB") {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  }

  // Default: group by 3s
  const groups = [];
  for (let i = 0; i < digits.length; i += 3) {
    groups.push(digits.slice(i, i + 3));
  }
  return groups.join(" ");
};

/**
 * Get placeholder text for phone input based on country
 */
export const getPhonePlaceholder = (countryCode: CountryCode): string => {
  switch (countryCode) {
    case "US":
    case "CA":
      return "(555) 123-4567";
    case "GB":
      return "7911 123456";
    case "AU":
      return "412 345 678";
    case "DE":
      return "151 12345678";
    case "FR":
      return "6 12 34 56 78";
    default:
      return "123 456 7890";
  }
};

/**
 * Get max length for phone input based on country (digits only)
 */
export const getMaxPhoneLength = (countryCode: CountryCode): number => {
  switch (countryCode) {
    case "US":
    case "CA":
      return 10;
    case "GB":
      return 11;
    case "AU":
      return 9;
    default:
      return 15;
  }
};
