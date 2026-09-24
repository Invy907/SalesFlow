export const generatedEstimateJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "lines", "templateMessage", "remarks", "evidenceIndexes", "warnings"],
  properties: {
    subject: { type: "string", maxLength: 70 },
    lines: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "qty", "unit", "unitPrice", "taxCategory", "confidence", "reason", "quantityReason"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          qty: { type: "number", exclusiveMinimum: 0, maximum: 999999 },
          unit: { type: "string", maxLength: 50 },
          unitPrice: { type: "integer", minimum: -999999999999, maximum: 999999999999 },
          taxCategory: {
            type: "string",
            enum: ["follow_company", "standard_10", "reduced_8", "standard_8", "exempt", "standard_5"],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string", maxLength: 500 },
          quantityReason: { type: "string", maxLength: 500 },
        },
      },
    },
    templateMessage: { type: "string", maxLength: 2000 },
    remarks: { type: "string", maxLength: 5000 },
    evidenceIndexes: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "integer", minimum: 0, maximum: 9 },
    },
    warnings: {
      type: "array",
      maxItems: 20,
      items: { type: "string", maxLength: 500 },
    },
  },
} as const;

/** Provider wire schemas are intentionally narrower than the application validator. */
export function providerJsonSchema(schema: unknown, provider: "gemini" | "anthropic"): unknown {
  if (Array.isArray(schema)) return schema.map((value) => providerJsonSchema(value, provider));
  if (!schema || typeof schema !== "object") return schema;
  const unsupported = new Set(provider === "anthropic"
    ? ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems"]
    : ["exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength"]);
  return Object.fromEntries(Object.entries(schema).filter(([key, value]) => !unsupported.has(key)
    && !(provider === "anthropic" && key === "minItems" && Number(value) > 1))
    .map(([key, value]) => [key, providerJsonSchema(value, provider)]));
}
