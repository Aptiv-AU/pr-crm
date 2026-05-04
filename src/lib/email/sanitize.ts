/**
 * Shared address / header sanitisation for outgoing email providers.
 * Re-exports Gmail's helpers so both Gmail and Microsoft Graph go through
 * the same shape check before any user-supplied subject or recipient
 * touches the wire.
 */
export { stripControlChars, assertSingleRfc5322Address } from "./gmail";
