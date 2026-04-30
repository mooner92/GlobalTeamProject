// KEI Global Gateway — landing page renderer.
// Loads research-areas.json, featured.json, and destinations.json and renders
// each section. Treats every external link with target="_blank" rel="noopener"
// and screen-reader "(opens in new tab)" affordance.

(function () {
  "use strict";

  const DATA_PATHS = {
    areas: "data/research-areas.json",
    featured: "data/featured.json",
    destinations: "data/destinations.json",
  };

  const ICON_PATHS = {
    cloud: "M7 18a5 5 0 1 1 .6-9.96A6 6 0 0 1 19 13a4 4 0 0 1-1 7.87",
    wind: "M3 8h12a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3",
    droplet: "M12 3.5s6 6.6 6 11a6 6 0 1 1-12 0c0-4.4 6-11 6-11z",
    recycle:
      "M7 7l-3 4 3 4M21 11l-3-4-3 4M14 21l-3-4-3 4M5 11h12M9 7l3-4 3 4M9 17l-3 4",
    leaf: "M5 20s2-12 14-14c0 0 1 13-9 14a5 5 0 0 1-5-5",
    building: "M4 21V7l8-4 8 4v14M9 21v-6h6v6M8 11h2M14 11h2M8 15h2M14 15h2",
    "heart-pulse":
      "M12 21s-7-5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6-7 11-7 11M3 12h4l2-3 3 6 2-3h7",
    flask: "M9 3h6M10 3v6L4 20a1 1 0 0 0 .87 1.5h14.26A1 1 0 0 0 20 20l-6-11V3",
    "book-open":
      "M3 5h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H3zM21 5h-7a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h7z",
    "file-text":
      "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h6",
    globe:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
    info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h0",
    sparkle:
      "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  };

  const state = {
    areas: [],
    featured: [],
    destinations: [],
  };

  document.addEventListener("DOMContentLoaded", function () {
    bootstrapLanguage();
    wireLangToggle();
    wireSmoothAnchors();
    void loadAll();
  });

  function bootstrapLanguage() {
    if (typeof window.KEII18n !== "undefined") {
      const initial = window.KEII18n.getLang();
      window.KEII18n.setLang(initial);
      window.KEII18n.applyLang(initial);
    }
  }

  function wireLangToggle() {
    if (typeof window.KEII18n === "undefined") return;
    const toggle = document.getElementById("langToggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      const current = window.KEII18n.getLang();
      const next = current === "ko" ? "en" : "ko";
      window.KEII18n.setLang(next);
      window.KEII18n.applyLang(next);
      announce(window.KEII18n.t("lang.switched." + next, next));
    });
    document.addEventListener("kei:langchanged", function () {
      renderAreas();
      renderFeatured();
      renderDestinations();
    });
  }

  function wireSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        const href = link.getAttribute("href") || "";
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  async function loadAll() {
    try {
      const [areas, featured, destinations] = await Promise.all([
        fetchJson(DATA_PATHS.areas),
        fetchJson(DATA_PATHS.featured),
        fetchJson(DATA_PATHS.destinations),
      ]);
      state.areas = (areas && areas.items) || [];
      state.featured = (featured && featured.items) || [];
      state.destinations = (destinations && destinations.items) || [];
      renderAreas();
      renderFeatured();
      renderDestinations();
      window.__keiGatewayReady = true;
      document.dispatchEvent(new CustomEvent("kei:gateway-ready"));
    } catch (error) {
      console.error("[gateway] data load failed:", error);
      renderLoadError(error);
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + path);
    }
    return response.json();
  }

  function getLang() {
    if (typeof window.KEII18n !== "undefined") {
      return window.KEII18n.getLang();
    }
    return "en";
  }

  function pickLocalized(item, base) {
    const lang = getLang();
    const key = base + "_" + lang;
    if (item && typeof item[key] === "string" && item[key]) return item[key];
    const fallback = item ? item[base + "_en"] : "";
    return typeof fallback === "string" ? fallback : "";
  }

  function renderAreas() {
    const grid = document.getElementById("areasGrid");
    if (!grid) return;
    grid.replaceChildren();
    state.areas.forEach(function (area) {
      const card = document.createElement("a");
      card.className = "gateway-area-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("href", area.destination || "#destinations");
      card.setAttribute("data-area-id", area.id);
      card.setAttribute("data-omc-cta", "area-" + area.id);
      const isExternal = !!area.destination;
      if (isExternal) {
        card.setAttribute("target", "_blank");
        card.setAttribute("rel", "noopener");
      }
      const icon = createIcon(area.icon || "leaf");
      card.appendChild(icon);
      const title = document.createElement("h3");
      title.className = "gateway-area-title";
      title.textContent = pickLocalized(area, "title");
      card.appendChild(title);
      const blurb = document.createElement("p");
      blurb.className = "gateway-area-blurb";
      blurb.textContent = pickLocalized(area, "blurb");
      card.appendChild(blurb);
      if (isExternal) {
        const hint = document.createElement("span");
        hint.className = "external-tab-hint visually-hidden";
        hint.setAttribute("data-i18n", "gateway.opensInNewTab");
        hint.textContent =
          typeof window.KEII18n !== "undefined"
            ? window.KEII18n.t("gateway.opensInNewTab", getLang())
            : "(opens in a new tab)";
        card.appendChild(hint);
      }
      grid.appendChild(card);
    });
  }

  function renderFeatured() {
    const grid = document.getElementById("featuredGrid");
    if (!grid) return;
    grid.replaceChildren();
    const items = state.featured
      .filter(function (it) {
        return it && typeof it.url === "string" && it.url.length > 0;
      })
      .sort(function (a, b) {
        return (a.rank || 99) - (b.rank || 99);
      });

    items.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "gateway-featured-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("data-feat-id", item.id);

      const coverWrap = document.createElement("div");
      coverWrap.className = "gateway-featured-cover";
      if (
        item.cover_url &&
        (item.cover_url.startsWith("https://") ||
          item.cover_url.startsWith("data/"))
      ) {
        const img = document.createElement("img");
        img.className = "gateway-featured-cover-img";
        img.src = item.cover_url;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.addEventListener("error", function () {
          coverWrap.replaceChildren(buildFeaturedPlaceholder(item));
        });
        coverWrap.appendChild(img);
      } else {
        coverWrap.appendChild(buildFeaturedPlaceholder(item));
      }
      card.appendChild(coverWrap);

      const body = document.createElement("div");
      body.className = "gateway-featured-body";

      if (item.year) {
        const meta = document.createElement("p");
        meta.className = "gateway-featured-meta";
        meta.textContent = String(item.year);
        body.appendChild(meta);
      }

      const title = document.createElement("h3");
      title.className = "gateway-featured-title";
      title.textContent = pickLocalized(item, "title");
      body.appendChild(title);

      const summary = document.createElement("p");
      summary.className = "gateway-featured-summary";
      summary.textContent = pickLocalized(item, "summary");
      body.appendChild(summary);

      if (item.authors) {
        const authors = document.createElement("p");
        authors.className = "gateway-featured-authors";
        authors.textContent = item.authors;
        body.appendChild(authors);
      }

      const cta = document.createElement("a");
      cta.className = "gateway-featured-cta";
      cta.href = item.url;
      cta.target = "_blank";
      cta.rel = "noopener";
      cta.setAttribute("data-omc-cta", "featured-" + item.id);
      const ctaLabel = document.createElement("span");
      ctaLabel.setAttribute("data-i18n", "gateway.featured.cta");
      ctaLabel.textContent =
        typeof window.KEII18n !== "undefined"
          ? window.KEII18n.t("gateway.featured.cta", getLang())
          : "Read full paper";
      cta.appendChild(ctaLabel);
      const ctaHint = document.createElement("span");
      ctaHint.className = "external-tab-hint visually-hidden";
      ctaHint.textContent =
        typeof window.KEII18n !== "undefined"
          ? window.KEII18n.t("gateway.opensInNewTab", getLang())
          : "(opens in a new tab)";
      cta.appendChild(ctaHint);
      body.appendChild(cta);

      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function buildFeaturedPlaceholder(item) {
    const placeholder = document.createElement("div");
    placeholder.className = "gateway-featured-placeholder";
    const initials = getInitials(pickLocalized(item, "title")) || "KEI";
    placeholder.textContent = initials;
    return placeholder;
  }

  function getInitials(title) {
    if (!title || typeof title !== "string") return "";
    const cleaned = title.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
    if (!cleaned) return "";
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function renderDestinations() {
    const grid = document.getElementById("destinationsGrid");
    if (!grid) return;
    grid.replaceChildren();
    state.destinations.forEach(function (dest) {
      const card = document.createElement("a");
      card.className = "gateway-destination-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("href", dest.url);
      card.setAttribute("target", "_blank");
      card.setAttribute("rel", "noopener");
      card.setAttribute("data-dest-id", dest.id);
      card.setAttribute("data-omc-cta", "dest-" + dest.id);

      const head = document.createElement("div");
      head.className = "gateway-destination-head";
      head.appendChild(createIcon(dest.icon || "globe"));
      const arrow = document.createElement("span");
      arrow.className = "gateway-destination-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      head.appendChild(arrow);
      card.appendChild(head);

      const title = document.createElement("h3");
      title.className = "gateway-destination-title";
      title.textContent = pickLocalized(dest, "title");
      card.appendChild(title);

      const blurb = document.createElement("p");
      blurb.className = "gateway-destination-blurb";
      blurb.textContent = pickLocalized(dest, "blurb");
      card.appendChild(blurb);

      const audience = document.createElement("p");
      audience.className = "gateway-destination-audience";
      audience.textContent = pickLocalized(dest, "audience_hint");
      card.appendChild(audience);

      const hint = document.createElement("span");
      hint.className = "external-tab-hint visually-hidden";
      hint.textContent =
        typeof window.KEII18n !== "undefined"
          ? window.KEII18n.t("gateway.opensInNewTab", getLang())
          : "(opens in a new tab)";
      card.appendChild(hint);
      grid.appendChild(card);
    });
  }

  function createIcon(name) {
    const path = ICON_PATHS[name] || ICON_PATHS["leaf"];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "gateway-icon");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  function renderLoadError(error) {
    const main = document.getElementById("main");
    if (!main) return;
    const banner = document.createElement("div");
    banner.className = "gateway-error-banner";
    banner.setAttribute("role", "alert");
    banner.textContent =
      "Could not load gateway content. " +
      (error && error.message ? error.message : "");
    main.prepend(banner);
  }

  function announce(message) {
    const status = document.getElementById("interactionStatus");
    if (!status) return;
    status.textContent = "";
    setTimeout(function () {
      status.textContent = message || "";
    }, 25);
  }

  // Test hooks
  window.__keiGetGatewayState = function () {
    return {
      areas: state.areas.length,
      featured: state.featured.length,
      destinations: state.destinations.length,
      ready: window.__keiGatewayReady === true,
    };
  };
})();
