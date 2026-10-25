import { expect, test } from "bun:test";
import { certificateErrorText, certificateReason, isCertificateError } from "../extension/src/certificate-errors";

const EXACT = [
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "CERT_UNTRUSTED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
];
const ANY_CASE = ["unable to get local issuer certificate", "self signed certificate in certificate chain", "self-signed certificate in certificate chain", "certificate verify failed", "SSL certificate problem", "curl: (60)"];

test("every code marker is a certificate error, inside the text omp or Node wrote", () => {
  for (const marker of EXACT) {
    expect(isCertificateError(marker), marker).toBe(true);
    expect(isCertificateError(`error: request failed, reason: ${marker}\n    at TLSSocket.onConnectSecure`), marker).toBe(true);
    // The codes are matched as written.
    expect(isCertificateError(marker.toLowerCase()), marker.toLowerCase()).toBe(false);
  }
});

test("every phrase marker is a certificate error whatever its case", () => {
  for (const marker of ANY_CASE) {
    expect(isCertificateError(marker), marker).toBe(true);
    expect(isCertificateError(marker.toUpperCase()), marker.toUpperCase()).toBe(true);
    expect(isCertificateError(`fetch failed: ${marker} (while reaching a server)`), marker).toBe(true);
  }
  expect(isCertificateError("Error: unable to get local issuer certificate")).toBe(true);
  expect(isCertificateError("curl: (60) SSL certificate problem: self-signed certificate in certificate chain")).toBe(true);
});

test("a reason that is not a certificate error is not one", () => {
  for (const text of ["", "omp exited with code 1", "omp not found at /usr/bin/omp", "connect ECONNREFUSED 127.0.0.1:443", "getaddrinfo ENOTFOUND api.anthropic.com", "401 Unauthorized", "curl: (6) Could not resolve host", "the certificate", "certificate"]) {
    expect(isCertificateError(text), text).toBe(false);
  }
});

test("the text is the one of the mode, without a final full stop, naming no product and never suggesting the mode", () => {
  expect(certificateErrorText(false)).toBe("omp could not verify a server's certificate; a corporate proxy that inspects HTTPS traffic is the usual cause");
  expect(certificateErrorText(true)).toBe("omp could not verify a server's certificate, even with System Certificates on; a corporate proxy that inspects HTTPS traffic is the usual cause");
  for (const on of [false, true]) {
    const text = certificateErrorText(on);
    expect(text.endsWith(".")).toBe(false);
    expect(/turn|enable|switch|mitm|zscaler|netskope|fiddler|charles/i.test(text)).toBe(false);
  }
  // Off, the text does not name the mode at all.
  expect(certificateErrorText(false)).not.toContain("System Certificates");
});

test("the reason is replaced only when one of the texts it comes from is a certificate error", () => {
  expect(certificateReason("omp exited (code 1)", ["omp exited (code 1)", "Error: SELF_SIGNED_CERT_IN_CHAIN"], false)).toBe(certificateErrorText(false));
  expect(certificateReason("omp exited (code 1)", ["omp exited (code 1)", "Error: SELF_SIGNED_CERT_IN_CHAIN"], true)).toBe(certificateErrorText(true));
  expect(certificateReason("omp refused the prompt (certificate verify failed)", ["omp refused the prompt (certificate verify failed)"], false)).toBe(certificateErrorText(false));
  expect(certificateReason("omp exited (code 1)", ["omp exited (code 1)", undefined], false)).toBe("omp exited (code 1)");
  expect(certificateReason("omp exited (code 1)", ["omp exited (code 1)", "segmentation fault"], true)).toBe("omp exited (code 1)");
  expect(certificateReason("omp exited (code 1)", [], true)).toBe("omp exited (code 1)");
});
