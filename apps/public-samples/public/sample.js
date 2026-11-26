(() => {
  const mount = document.getElementById("sample");
  if (!mount) return;
  const slug = mount.dataset.slug || "";
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  const support = "abdelhaktirha@gmail.com";

  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const link = (href, label, className) => {
    const el = node("a", className, label);
    el.href = href;
    return el;
  };
  const revealUnavailable = () => {
    mount.replaceChildren();
    const panel = node("section", "unavailable");
    panel.append(node("div", "brand-mark", "G"));
    panel.append(node("p", "eyebrow", "GETSTAYGUIDE · PERSONAL SAMPLE"));
    panel.append(node("h1", "", "This sample link is unavailable"));
    panel.append(node("p", "lead", "The link may be incomplete or expired. Request a fresh personalised sample and we’ll check the details manually."));
    panel.append(link("mailto:" + support + "?subject=" + encodeURIComponent("Request a fresh GetStayGuide sample"), "Request a fresh sample", "button button-primary"));
    panel.append(link("https://www.getstayguide.com/", "Visit GetStayGuide", "text-link"));
    mount.append(panel);
  };

  if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token) || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    revealUnavailable();
    return;
  }

  fetch("/api/sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify({ slug, token })
  }).then(async response => {
    if (!response.ok) throw new Error("unavailable");
    return response.json();
  }).then(guide => {
    mount.replaceChildren();
    const header = node("header", "topbar");
    const brand = node("div", "brand");
    brand.append(node("span", "brand-mark", "G"));
    brand.append(node("span", "brand-word", "getstayguide<span>·</span>"));
    header.append(brand);
    header.append(node("span", "top-note", "A thoughtful welcome, made simple"));
    mount.append(header);

    const notice = node("div", "sample-notice");
    notice.append(node("span", "notice-dot", "i"));
    notice.append(node("p", "", "Unofficial sample concept based on publicly available information. Not authorised, approved or operated by this property. Not for guest use."));
    mount.append(notice);

    const hero = node("section", "hero");
    const heroCopy = node("div", "hero-copy");
    heroCopy.append(node("p", "eyebrow", guide.manager + " · SAMPLE DESIGN"));
    heroCopy.append(node("h1", "", guide.property));
    heroCopy.append(node("p", "location", guide.location));
    heroCopy.append(node("p", "lead", guide.summary));
    const badges = node("div", "badges");
    badges.append(node("span", "", "Designed for mobile"));
    badges.append(node("span", "", "No property photos used"));
    heroCopy.append(badges);
    hero.append(heroCopy);
    const card = node("aside", "brand-card");
    card.append(node("span", "card-label", "A guest guide can bring together"));
    card.append(node("strong", "", "Arrival details, useful local tips, and the little things that make a stay easier."));
    card.append(node("span", "card-sparkle", "✦"));
    hero.append(card);
    mount.append(hero);

    const grid = node("section", "content-grid");
    const about = node("article", "content-card");
    about.append(node("p", "eyebrow", "THE PROPERTY"));
    about.append(node("h2", "", "A stay with its own story"));
    about.append(node("p", "body-copy", guide.summary));
    const highlights = node("ul", "fact-list");
    guide.highlights.forEach(item => highlights.append(node("li", "", item)));
    about.append(highlights);
    grid.append(about);

    const local = node("article", "content-card local-card");
    local.append(node("p", "eyebrow", "AROUND YOU"));
    local.append(node("h2", "", "Explore nearby"));
    const recs = node("ul", "recommendation-list");
    guide.recommendations.forEach(item => recs.append(node("li", "", item)));
    local.append(recs);
    grid.append(local);
    mount.append(grid);

    const stay = node("section", "stay-grid");
    const arrival = node("article", "stay-card");
    arrival.append(node("span", "stay-icon", "01"));
    arrival.append(node("p", "eyebrow", "ARRIVAL"));
    arrival.append(node("p", "body-copy", guide.arrival));
    stay.append(arrival);
    const departure = node("article", "stay-card");
    departure.append(node("span", "stay-icon", "02"));
    departure.append(node("p", "eyebrow", "DEPARTURE"));
    departure.append(node("p", "body-copy", guide.departure));
    stay.append(departure);
    mount.append(stay);

    const offer = node("section", "offer");
    const offerCopy = node("div", "");
    offerCopy.append(node("p", "eyebrow", "FOUNDING FIVE"));
    offerCopy.append(node("h2", "", "$49 USD <span>· one-time</span>"));
    offerCopy.append(node("p", "body-copy", "One personalised property guide, one consolidated revision, and 12 months of basic hosting from publication. No automatic renewal or monthly charge."));
    offerCopy.append(node("p", "fine-print", "AI automation, automated WhatsApp messaging, PMS connections and property management are not included."));
    offer.append(offerCopy);
    const cta = link("mailto:" + support + "?subject=" + encodeURIComponent("GetStayGuide Founding Five — " + guide.property) + "&body=" + encodeURIComponent("Hello, I would like to discuss a GetStayGuide guest guide for my property.\n\nI understand the Founding Five offer is $49 USD one-time for one guide, one consolidated revision and 12 months of basic hosting from publication, with no automatic renewal.\n\nPlease send me the next steps."), "Request your $49 guide", "button button-primary");
    cta.setAttribute("aria-label", "Request the $49 USD Founding Five guide by email");
    offer.append(cta);
    mount.append(offer);

    const source = node("section", "source-note");
    source.append(node("p", "fine-print", "Sample information is limited to the public source below. The property operator must confirm all facts, arrival and departure instructions before any real guest guide is published. No endorsement or business relationship is implied."));
    const sourceLink = link(guide.source, "View the public information source ↗", "text-link");
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer nofollow";
    source.append(sourceLink);
    mount.append(source);

    const footer = node("footer", "footer");
    footer.append(node("span", "", "getstayguide.com"));
    footer.append(link("mailto:" + support, "Questions? Contact us", "text-link"));
    mount.append(footer);
  }).catch(revealUnavailable);
})();
