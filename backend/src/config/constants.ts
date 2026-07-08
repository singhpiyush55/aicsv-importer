// These are simple constant lists we reuse in the prompt AND in our
// own validation code. Keeping them in one place means we only have
// to update them here if GrowEasy ever changes the rules.

// The ONLY allowed values for crm_status.
export const ALLOWED_CRM_STATUS = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

// The ONLY allowed values for data_source. If the AI is not confident,
// it should leave this blank instead of guessing.
export const ALLOWED_DATA_SOURCE = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

// The final list of fields every CRM lead should have.
export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];
