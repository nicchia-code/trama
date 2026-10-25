// Certificate errors of omp (`rules#developer.REFRESH_SYSTEM_CERTIFICATES`): the test and the text that replaces the reason. Pure and shared by the host and the
// webview; the host computes both, the webview receives the reason already written.

/** Markers that are matched as written, whatever surrounds them. */
const EXACT_MARKERS: readonly string[] = [
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "CERT_UNTRUSTED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
];

/** Markers that are matched ignoring case. */
const TEXT_MARKERS: readonly string[] = [
  "unable to get local issuer certificate",
  "self signed certificate in certificate chain",
  "self-signed certificate in certificate chain",
  "certificate verify failed",
  "SSL certificate problem",
  "curl: (60)",
].map((marker) => marker.toLowerCase());

/** Whether `text` (omp's error output, the message of an ACP error, the output of a failed command) says omp could not verify a server's certificate. */
export function isCertificateError(text: string): boolean {
  if (EXACT_MARKERS.some((marker) => text.includes(marker))) return true;
  const lower = text.toLowerCase();
  return TEXT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * The text that takes the place of the reason of a certificate error, without a final full stop. With System Certificates on it says so; it never names a
 * product and never suggests turning the mode on.
 */
export const certificateErrorText = (systemCertificates: boolean): string =>
  systemCertificates
    ? "omp could not verify a server's certificate, even with System Certificates on; a corporate proxy that inspects HTTPS traffic is the usual cause"
    : "omp could not verify a server's certificate; a corporate proxy that inspects HTTPS traffic is the usual cause";

/**
 * The reason to show: the certificate error text when any of `sources` (the texts the reason comes from, `undefined` ones skipped) is a certificate error,
 * otherwise `reason` as it is.
 */
export function certificateReason(reason: string, sources: readonly (string | undefined)[], systemCertificates: boolean): string {
  return sources.some((source) => source !== undefined && isCertificateError(source)) ? certificateErrorText(systemCertificates) : reason;
}

/** Whether `reason` is the certificate error text of either mode, as the host wrote it. */
const isCertificateText = (reason: string): boolean => reason === certificateErrorText(false) || reason === certificateErrorText(true);

/**
 * `reason` as a line of its own in the panel (the reason line of the models list): the certificate error text, which has no final full stop, gets one; any other reason is
 * shown as the host wrote it.
 */
export const reasonLine = (reason: string): string => (isCertificateText(reason) ? `${reason}.` : reason);
