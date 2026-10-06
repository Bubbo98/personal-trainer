let sequence = 0;

/** A unique key for list items created in the browser (React keys, drag & drop ids). */
export const newKey = (): string => `k${Date.now().toString(36)}-${(sequence++).toString(36)}`;
