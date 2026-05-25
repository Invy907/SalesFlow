export type CompanyProfile = {
  postalCode: string;
  addressLine1: string;
  companyNameLine1: string;
  tel: string;
  fax: string;
  email: string;
};

const STORAGE_KEY = "salesflow:companyProfile";

export function getCompanyProfile(): CompanyProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CompanyProfile;
  } catch {
    return null;
  }
}

export function saveCompanyProfile(profile: CompanyProfile) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function isCompanyProfileComplete(profile: CompanyProfile | null = getCompanyProfile()) {
  if (!profile) {
    return false;
  }

  return (
    profile.postalCode.trim().length > 0 &&
    profile.addressLine1.trim().length > 0 &&
    profile.companyNameLine1.trim().length > 0
  );
}
