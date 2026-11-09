/** Rough, human-friendly device label from a User-Agent string. */
export function describeDevice(ua: string): string {
  if (!ua) return "Unknown device";
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? "Android phone"
          : "Android tablet"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows PC"
            : /CrOS/.test(ua)
              ? "Chromebook"
              : /Linux/.test(ua)
                ? "Linux"
                : "Unknown device";
  const browser = /EdgA?\//.test(ua)
    ? "Edge"
    : /FxiOS|Firefox\//.test(ua)
      ? "Firefox"
      : /CriOS|Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return browser ? `${browser} on ${device}` : device;
}
