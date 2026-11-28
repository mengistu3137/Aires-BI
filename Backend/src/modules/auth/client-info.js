const WINDOWS_VERSIONS = {
  "10.0": "10/11",
  "6.3": "8.1",
  "6.2": "8",
  "6.1": "7",
};

const firstMatch = (value, pattern) => {
  const match = value.match(pattern);
  return match ? match[1] : null;
};

const browserFrom = (userAgent) => {
  const edge = firstMatch(userAgent, /Edg\/(\d+(?:\.\d+)*)/);
  if (edge) return { browserName: "Edge", browserVersion: edge };
  const firefox = firstMatch(userAgent, /Firefox\/(\d+(?:\.\d+)*)/);
  if (firefox) return { browserName: "Firefox", browserVersion: firefox };
  const crios = firstMatch(userAgent, /CriOS\/(\d+(?:\.\d+)*)/);
  if (crios) return { browserName: "Chrome", browserVersion: crios };
  const chrome = firstMatch(userAgent, /Chrome\/(\d+(?:\.\d+)*)/);
  if (chrome) return { browserName: "Chrome", browserVersion: chrome };
  const safari = firstMatch(userAgent, /Version\/(\d+(?:\.\d+)*).*Safari/);
  if (safari) return { browserName: "Safari", browserVersion: safari };
  return { browserName: null, browserVersion: null };
};

export const parseUserAgent = (userAgent = "") => {
  const browser = browserFrom(userAgent);
  const iphone = firstMatch(userAgent, /iPhone OS (\d+(?:[_.]\d+)*)/);
  if (iphone || /iPhone/.test(userAgent)) {
    return {
      osName: "iPhone",
      osVersion: iphone ? iphone.replace(/_/g, ".") : null,
      deviceType: "Phone",
      ...browser,
    };
  }
  const ipad = firstMatch(userAgent, /CPU OS (\d+(?:[_.]\d+)*)/);
  if (/iPad/.test(userAgent)) {
    return {
      osName: "iPad",
      osVersion: ipad ? ipad.replace(/_/g, ".") : null,
      deviceType: "Tablet",
      ...browser,
    };
  }
  const android = firstMatch(userAgent, /Android (\d+(?:\.\d+)*)/);
  if (android || /Android/.test(userAgent)) {
    return {
      osName: "Android",
      osVersion: android,
      deviceType: /Mobile/.test(userAgent) ? "Phone" : "Tablet",
      ...browser,
    };
  }
  const mac = firstMatch(userAgent, /Mac OS X (\d+(?:[_.]\d+)*)/);
  if (mac || /Macintosh/.test(userAgent)) {
    return {
      osName: "macOS",
      osVersion: mac ? mac.replace(/_/g, ".") : null,
      deviceType: "Desktop",
      ...browser,
    };
  }
  const windows = firstMatch(userAgent, /Windows NT (\d+\.\d+)/);
  if (windows || /Windows/.test(userAgent)) {
    return {
      osName: "Windows",
      osVersion: WINDOWS_VERSIONS[windows] || windows,
      deviceType: "Desktop",
      ...browser,
    };
  }
  return {
    osName: "Unknown",
    osVersion: null,
    deviceType: "Desktop",
    ...browser,
  };
};

const isPrivateAddress = (ip) => {
  const value = ip.replace(/^::ffff:/, "");
  return (
    value === "::1" ||
    value === "127.0.0.1" ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value)
  );
};

export const readClientAddress = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate = (raw || req.ip || req.socket?.remoteAddress || "").split(",")[0].trim();
  return candidate.replace(/^::ffff:/, "") || null;
};

export const lookupLocation = async (ip) => {
  if (!ip || isPrivateAddress(ip)) return "Local network";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`,
      { signal: controller.signal },
    );
    const data = await response.json();
    if (data.status !== "success") return null;
    return [data.city, data.regionName, data.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const describeClient = async (req) => {
  const ipAddress = readClientAddress(req);
  const userAgent = req.get("user-agent") || "";
  const parsed = parseUserAgent(userAgent);
  const location = await lookupLocation(ipAddress);
  return { ipAddress, userAgent: userAgent.slice(0, 500), location, ...parsed };
};
