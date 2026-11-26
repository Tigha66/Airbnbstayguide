(() => {
  const status = document.getElementById("status");
  const guide = document.getElementById("guide");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || "";
  const token = window.location.hash.slice(1);
  if (token) history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!token || !slug) {
    status.textContent = "This sample link is invalid or has expired. Please ask the GetStayGuide sender for a fresh link.";
    return;
  }
  fetch("/api/sample?slug=" + encodeURIComponent(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ token })
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Sample unavailable.");
    return payload;
  }).then(renderGuide).catch((error) => {
    status.textContent = error.message || "This sample link is invalid or has expired.";
  });

  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function section(title, content) {
    const part = node("section", "", "guide-section");
    part.append(node("h2", title));
    part.append(content);
    return part;
  }
  function renderGuide(data) {
    status.hidden = true;
    guide.hidden = false;
    guide.style.setProperty("--accent", data.accent);
    guide.append(node("h1", data.propertyName));
    guide.append(node("p", data.location, "location"));
    guide.append(node("p", data.summary, "summary"));
    const highlights = node("ul");
    for (const text of data.highlights || []) highlights.append(node("li", text));
    guide.append(section("About this stay", highlights));
    guide.append(section("Arrival", node("p", data.arrival)));
    guide.append(section("Departure", node("p", data.departure)));
    const recommendations = node("ul");
    for (const text of data.recommendations || []) recommendations.append(node("li", text));
    guide.append(section("Local recommendations", recommendations));
    const source = node("p");
    source.append(document.createTextNode("Source: "));
    const link = node("a", "public property information");
    link.href = data.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    source.append(link);
    guide.append(section("About this sample", source));
    const notice = node("p", "This is an unofficial sample for discussion only. The property owner or operator has not commissioned or approved it. It uses publicly available information, contains no property photographs or private access details, and must be checked with the host before any guest use.", "notice");
    guide.append(notice);
  }
})();
