let allProjects = [];
let filteredProjects = [];
let selectedFields = [];
let researchFields = [];
let fieldProjectCount = {};
let selectedProjects = new Set();
let fieldToOriginalMap = new Map();
let currentSort = "default";
let searchQuery = "";
let appliedDateRange = {
  startTimestamp: null,
  endTimestamp: null,
};
const titleCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});
const performanceConfig = getPerformanceConfig();
let activeRenderToken = 0;
let isPdfExportInProgress = false;

// F3 facet state
let selectedTypes = new Set();
let selectedYears = new Set();

// F2 modal state
let lastFocusBeforeModal = null;
let currentModalProjectId = null;

document.addEventListener("DOMContentLoaded", function () {
  // F1: Bootstrap language
  var initialLang = KEII18n.getLang();
  KEII18n.setLang(initialLang);
  KEII18n.applyLang(initialLang);
  applyLangToDateInputs(initialLang);

  // F1: Lang toggle click handler
  var langToggleBtn = document.getElementById("langToggle");
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", function () {
      var current = KEII18n.getLang();
      var next = current === "ko" ? "en" : "ko";
      KEII18n.setLang(next);
      KEII18n.applyLang(next);
      var statusKey = next === "ko" ? "lang.switched.ko" : "lang.switched.en";
      announceInteractionStatus(KEII18n.t(statusKey, next));
    });
  }

  // F1: Re-render on language change
  document.addEventListener("kei:langchanged", function (e) {
    var nextLang = (e && e.detail && e.detail.lang) || KEII18n.getLang();
    applyLangToDateInputs(nextLang);
    renderProjects();
    renderFacetChips();
    refreshDynamicLabels();
  });

  // F3: Reset filters button
  var resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      selectedFields = [];
      searchQuery = "";
      var searchInput = document.getElementById("projectSearchInput");
      if (searchInput) searchInput.value = "";
      var dateStart = document.getElementById("projectDateStart");
      if (dateStart) dateStart.value = "";
      var dateEnd = document.getElementById("projectDateEnd");
      if (dateEnd) dateEnd.value = "";
      appliedDateRange = { startTimestamp: null, endTimestamp: null };
      selectedTypes = new Set();
      selectedYears = new Set();
      setDateRangeFeedback("");
      updateFieldSelection();
      filterProjects();
      renderProjects();
      renderFacetChips();
      syncUrlParams();
    });
  }

  // F2: Modal close via backdrop/close-button (delegated)
  document.addEventListener("click", function (e) {
    if (
      e.target &&
      (e.target.hasAttribute("data-modal-close") ||
        e.target.closest("[data-modal-close]"))
    ) {
      var modal = document.getElementById("projectModal");
      if (modal && !modal.hidden) {
        closeProjectModal();
      }
    }
  });

  // F2: Modal focus trap + ESC
  document.addEventListener("keydown", function (e) {
    var modal = document.getElementById("projectModal");
    if (!modal || modal.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeProjectModal();
      return;
    }
    if (e.key === "Tab") {
      var card = modal.querySelector(".project-modal-card");
      if (!card) return;
      var focusable = Array.from(
        card.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      // Card has tabindex="-1" so it is not in `focusable`; redirect Tab/
      // Shift+Tab from card to first/last to keep focus inside the modal.
      if (document.activeElement === card) {
        e.preventDefault();
        if (e.shiftKey) last.focus();
        else first.focus();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  // F2: Wire copy-link and copy-citation buttons
  var copyLinkBtn = document.getElementById("projectModalCopyLink");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", function () {
      if (currentModalProjectId !== null) {
        copyProjectLink(currentModalProjectId);
      }
    });
  }
  var copyCiteBtn = document.getElementById("projectModalCopyCite");
  if (copyCiteBtn) {
    copyCiteBtn.addEventListener("click", function () {
      if (currentModalProjectId !== null) {
        copyProjectCitation(currentModalProjectId);
      }
    });
  }

  // F2: popstate — handle back/forward hash changes
  window.addEventListener("popstate", function () {
    var hashId = parseHashProjectId();
    var modal = document.getElementById("projectModal");
    if (hashId !== null) {
      openProjectModal(hashId, true);
    } else if (modal && !modal.hidden) {
      closeProjectModal(true);
    }
  });

  initializeResultsToolbarControls();
  updateServerStatus();
  loadData();
});

// F1: Refresh labels that are generated by JS and need re-render on lang change
function refreshDynamicLabels() {
  createResearchFieldsGrid();
}

// F1: localized date helper
function localizedDate(date) {
  return new Date(date).toLocaleDateString(
    KEII18n.getLang() === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );
}

function normalizeFieldName(fieldName) {
  if (
    window.KEIDataContract &&
    typeof window.KEIDataContract.normalizeFieldKey === "function"
  ) {
    return window.KEIDataContract.normalizeFieldKey(fieldName);
  }
  if (!fieldName || typeof fieldName !== "string") return "";
  let normalized = fieldName.trim().toLowerCase();
  normalized = normalized.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
  );
  return normalized;
}

function updateServerStatus() {
  document.getElementById("serverStatus").textContent = "Static Mode";
  document.getElementById("serverStatus").style.color = "#00A887";
}

function initializeResultsToolbarControls() {
  const searchInput = document.getElementById("projectSearchInput");
  const dateStartInput = document.getElementById("projectDateStart");
  const dateEndInput = document.getElementById("projectDateEnd");

  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInputChange);
    searchQuery = normalizeSearchQuery(searchInput.value);
  }

  if (dateStartInput) {
    dateStartInput.addEventListener("input", handleDateRangeInputChange);
  }

  if (dateEndInput) {
    dateEndInput.addEventListener("input", handleDateRangeInputChange);
  }

  applyDateRangeFromInputs();
}

function normalizeSearchQuery(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

function handleSearchInputChange(event) {
  searchQuery = normalizeSearchQuery(event.target.value);
  filterProjects();
  renderProjects();
  syncUrlParams();
}

function parseDateInputValue(inputValue, useEndOfDay) {
  if (!inputValue || typeof inputValue !== "string") {
    return null;
  }

  const match = inputValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const timestamp = useEndOfDay
    ? Date.UTC(year, month - 1, day, 23, 59, 59, 999)
    : Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  const date = new Date(timestamp);
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day;

  return isValidDate ? timestamp : null;
}

function setDateRangeFeedback(message) {
  const feedback = document.getElementById("dateRangeFeedback");
  const dateStartInput = document.getElementById("projectDateStart");
  const dateEndInput = document.getElementById("projectDateEnd");
  const hasError = Boolean(message);

  if (feedback) {
    feedback.textContent = hasError ? message : "";
  }

  [dateStartInput, dateEndInput].forEach(function (input) {
    if (!input) {
      return;
    }
    input.setAttribute("aria-invalid", String(hasError));
  });
}

function applyDateRangeFromInputs() {
  const dateStartInput = document.getElementById("projectDateStart");
  const dateEndInput = document.getElementById("projectDateEnd");
  const startValue = dateStartInput ? dateStartInput.value : "";
  const endValue = dateEndInput ? dateEndInput.value : "";
  const nextStartTimestamp = parseDateInputValue(startValue, false);
  const nextEndTimestamp = parseDateInputValue(endValue, true);

  if (
    startValue &&
    endValue &&
    nextStartTimestamp !== null &&
    nextEndTimestamp !== null &&
    nextEndTimestamp < nextStartTimestamp
  ) {
    var lang = KEII18n.getLang();
    setDateRangeFeedback(KEII18n.t("toast.date.invalid", lang));
    return false;
  }

  setDateRangeFeedback("");
  appliedDateRange = {
    startTimestamp: nextStartTimestamp,
    endTimestamp: nextEndTimestamp,
  };
  return true;
}

function handleDateRangeInputChange() {
  const isValidRange = applyDateRangeFromInputs();
  if (!isValidRange) {
    var lang = KEII18n.getLang();
    announceInteractionStatus(KEII18n.t("toast.date.invalid", lang));
    return;
  }

  filterProjects();
  renderProjects();
  syncUrlParams();
}

function hasActiveDateRangeFilter() {
  return (
    appliedDateRange.startTimestamp !== null ||
    appliedDateRange.endTimestamp !== null
  );
}

function projectMatchesSelectedFields(project) {
  if (selectedFields.length === 0) {
    return true;
  }

  return selectedFields.some(function (field) {
    return (
      project.primaryFocusKey === field || project.secondaryFocusKey === field
    );
  });
}

function projectMatchesSearch(project) {
  if (!searchQuery) {
    return true;
  }

  const title = (project.title || "").toLowerCase();
  const pi = (project.pi || "").toLowerCase();
  return title.includes(searchQuery) || pi.includes(searchQuery);
}

function projectMatchesDateRange(project) {
  if (!hasActiveDateRangeFilter()) {
    return true;
  }

  const projectStartTimestamp = Number.isFinite(project.projectStartTimestamp)
    ? project.projectStartTimestamp
    : null;
  const projectEndTimestamp = Number.isFinite(project.projectEndTimestamp)
    ? project.projectEndTimestamp
    : null;

  if (projectStartTimestamp === null && projectEndTimestamp === null) {
    return false;
  }

  const effectiveStart =
    projectStartTimestamp !== null
      ? projectStartTimestamp
      : projectEndTimestamp;
  const effectiveEnd =
    projectEndTimestamp !== null ? projectEndTimestamp : projectStartTimestamp;

  if (
    appliedDateRange.startTimestamp !== null &&
    effectiveEnd < appliedDateRange.startTimestamp
  ) {
    return false;
  }

  if (
    appliedDateRange.endTimestamp !== null &&
    effectiveStart > appliedDateRange.endTimestamp
  ) {
    return false;
  }

  return true;
}

// F3: type/year facet matching
function projectMatchesTypeFacet(project) {
  if (selectedTypes.size === 0) return true;
  return selectedTypes.has(project.type);
}

function projectMatchesYearFacet(project) {
  if (selectedYears.size === 0) return true;
  var ts = Number.isFinite(project.projectStartTimestamp)
    ? project.projectStartTimestamp
    : Number.isFinite(project.projectEndTimestamp)
      ? project.projectEndTimestamp
      : null;
  if (ts === null) return false;
  var year = String(new Date(ts).getUTCFullYear());
  return selectedYears.has(year);
}

// F3: "exclude self" facet count — count projects matching all filters EXCEPT
// the chip's own facet dimension, then filter by this chip's value.
function computeFacetCount(facetType, facetValue) {
  return allProjects.filter(function (project) {
    var passesFields = projectMatchesSelectedFields(project);
    var passesSearch = projectMatchesSearch(project);
    var passesDate = projectMatchesDateRange(project);
    var passesOtherFacet =
      facetType === "type"
        ? projectMatchesYearFacet(project)
        : projectMatchesTypeFacet(project);
    if (!passesFields || !passesSearch || !passesDate || !passesOtherFacet) {
      return false;
    }
    if (facetType === "type") {
      return project.type === facetValue;
    }
    var ts = Number.isFinite(project.projectStartTimestamp)
      ? project.projectStartTimestamp
      : Number.isFinite(project.projectEndTimestamp)
        ? project.projectEndTimestamp
        : null;
    if (ts === null) return false;
    return String(new Date(ts).getUTCFullYear()) === facetValue;
  }).length;
}

function getFilterStateSnapshot() {
  return {
    selectedFields: [...selectedFields],
    searchQuery: searchQuery,
    appliedDateRange: {
      startTimestamp: appliedDateRange.startTimestamp,
      endTimestamp: appliedDateRange.endTimestamp,
    },
    filteredProjects: filteredProjects.map(function (project) {
      return {
        id: project.id,
        title: project.title,
        pi: project.pi,
        primaryFocusKey: project.primaryFocusKey,
        secondaryFocusKey: project.secondaryFocusKey,
        projectStartTimestamp: Number.isFinite(project.projectStartTimestamp)
          ? project.projectStartTimestamp
          : null,
        projectEndTimestamp: Number.isFinite(project.projectEndTimestamp)
          ? project.projectEndTimestamp
          : null,
      };
    }),
  };
}

function setPdfExportStatus(message, isError) {
  const statusElement = document.getElementById("pdfExportStatus");
  if (!statusElement) {
    return;
  }
  statusElement.textContent = message || "";
  statusElement.classList.toggle("error", Boolean(isError));
}

function announceInteractionStatus(message) {
  const statusElement = document.getElementById("interactionStatus");
  if (!statusElement) {
    return;
  }
  statusElement.textContent = "";
  window.setTimeout(() => {
    statusElement.textContent = message || "";
  }, 25);
}

function setPdfExportControlsState(isBusy) {
  const pdfButton = document.getElementById("downloadBtn");
  const excelButton = document.getElementById("downloadExcelBtn");

  if (pdfButton) {
    if (isBusy) {
      pdfButton.setAttribute("data-export-busy", "true");
    } else {
      pdfButton.removeAttribute("data-export-busy");
    }
    pdfButton.disabled = isBusy || selectedProjects.size === 0;
  }

  if (excelButton) {
    excelButton.disabled = isBusy || selectedProjects.size === 0;
  }
}

function setPdfExportProgress(currentIndex, totalItems) {
  var lang = KEII18n.getLang();
  if (totalItems <= 0) {
    setPdfExportStatus(KEII18n.t("pdf.preparing", lang), false);
    return;
  }
  const clampedCurrent = Math.min(Math.max(currentIndex, 0), totalItems);
  const percent = Math.round((clampedCurrent / totalItems) * 100);
  setPdfExportStatus(
    KEII18n.t("pdf.progress", lang, {
      current: clampedCurrent,
      total: totalItems,
      percent: percent,
    }),
    false,
  );
}

function showErrorToast(message) {
  const existing = document.querySelector(".error-toast");
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.className = "error-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

function createLoadingStateElement(message) {
  const loadingState = document.createElement("div");
  loadingState.className = "loading-state";

  const spinner = document.createElement("div");
  spinner.className = "spinner";

  const loadingMessage = document.createElement("p");
  loadingMessage.textContent = message;

  loadingState.appendChild(spinner);
  loadingState.appendChild(loadingMessage);

  return loadingState;
}

function setProjectsListState(element) {
  const projectsList = document.getElementById("projectsList");
  projectsList.replaceChildren(element);
}

function getDataLoadConfig() {
  const params = new URLSearchParams(window.location.search);
  const dataFileParam = params.get("dataFile");
  const scanDepthParam = Number.parseInt(params.get("headerScanDepth"), 10);

  return {
    dataFilePath:
      dataFileParam && dataFileParam.trim()
        ? dataFileParam.trim()
        : "data/projects.xlsx",
    headerScanDepth:
      Number.isNaN(scanDepthParam) || scanDepthParam <= 0 ? 10 : scanDepthParam,
  };
}

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function getPerformanceConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    largeRenderThreshold: parsePositiveInt(
      params.get("largeRenderThreshold"),
      80,
    ),
    renderBatchSize: parsePositiveInt(params.get("renderBatchSize"), 25),
    pdfExportTimeoutMs: parsePositiveInt(
      params.get("pdfExportTimeoutMs"),
      45000,
    ),
  };
}

function nextAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function withTimeout(taskPromise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    taskPromise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function createParserErrorContextItems(errorInfo) {
  var lang = KEII18n.getLang();
  const details = errorInfo.details || {};
  const items = [];

  if (
    Array.isArray(details.missingHeaders) &&
    details.missingHeaders.length > 0
  ) {
    items.push(
      KEII18n.t("error.missing.headers", lang, {
        list: details.missingHeaders.join(", "),
      }),
    );
  }

  if (
    Array.isArray(details.availableSheets) &&
    details.availableSheets.length > 0
  ) {
    items.push(
      KEII18n.t("error.available.sheets", lang, {
        list: details.availableSheets.join(", "),
      }),
    );
  }

  if (typeof details.headerRowNumber === "number") {
    items.push(
      KEII18n.t("error.detected.row", lang, { row: details.headerRowNumber }),
    );
  }

  if (typeof details.headerScanDepth === "number") {
    items.push(
      KEII18n.t("error.scan.depth", lang, { depth: details.headerScanDepth }),
    );
  }

  if (details.sheetName) {
    items.push(
      KEII18n.t("error.expected.sheet", lang, { name: details.sheetName }),
    );
  }

  return items;
}

function buildDataLoadErrorInfo(error) {
  const fallback = {
    code: "DATA_LOAD_FAILED",
    message: "Could not load project data. Verify the workbook and try again.",
    details: {},
  };

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const contractError =
    window.KEIDataContract &&
    typeof window.KEIDataContract.DataContractError === "function"
      ? window.KEIDataContract.DataContractError
      : null;

  if (contractError && error instanceof contractError) {
    return {
      code: error.code || fallback.code,
      message: error.message || fallback.message,
      details: error.details || {},
    };
  }

  if (error.code && error.message) {
    return {
      code: error.code,
      message: error.message,
      details: error.details || {},
    };
  }

  if (error.message) {
    return {
      code: fallback.code,
      message: error.message,
      details: {},
    };
  }

  return fallback;
}

function createErrorStateElement(errorInfo) {
  var lang = KEII18n.getLang();
  const errorState = document.createElement("div");
  errorState.className = "error-state";

  const title = document.createElement("h3");
  title.textContent = KEII18n.t("error.title", lang);

  const code = document.createElement("p");
  code.className = "error-code";
  code.textContent = KEII18n.t("error.code.label", lang, {
    code: errorInfo.code || "DATA_LOAD_FAILED",
  });

  const detail = document.createElement("p");
  detail.textContent = errorInfo.message;

  const contextItems = createParserErrorContextItems(errorInfo);

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "btn btn-outline";
  retryButton.style.marginTop = "12px";
  retryButton.textContent = KEII18n.t("error.retry", lang);
  retryButton.addEventListener("click", loadData);

  errorState.appendChild(title);
  errorState.appendChild(code);
  errorState.appendChild(detail);

  if (contextItems.length > 0) {
    const contextList = document.createElement("ul");
    contextList.className = "error-context-list";
    contextItems.forEach(function (itemText) {
      const listItem = document.createElement("li");
      listItem.textContent = itemText;
      contextList.appendChild(listItem);
    });
    errorState.appendChild(contextList);
  }

  errorState.appendChild(retryButton);

  return errorState;
}

function createEmptyStateElement() {
  var lang = KEII18n.getLang();
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "48");
  svg.setAttribute("height", "48");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("fill", "none");
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  circle.setAttribute("cx", "24");
  circle.setAttribute("cy", "24");
  circle.setAttribute("r", "20");
  circle.setAttribute("stroke", "#00A887");
  circle.setAttribute("stroke-width", "2");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M16 24h16M24 16v16");
  path.setAttribute("stroke", "#00A887");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(circle);
  svg.appendChild(path);

  const heading = document.createElement("h3");
  heading.textContent = KEII18n.t("empty.title", lang);

  const hint = document.createElement("p");
  hint.textContent = KEII18n.t("empty.hint", lang);

  emptyState.appendChild(svg);
  emptyState.appendChild(heading);
  emptyState.appendChild(hint);
  return emptyState;
}

// F3: Seed filter state from URL params before first render
function seedFiltersFromUrl() {
  var params = new URLSearchParams(window.location.search);

  // Type facet
  var typeParam = params.get("type");
  if (typeParam) {
    typeParam.split(",").forEach(function (v) {
      var val = decodeURIComponent(v.trim());
      if (val) selectedTypes.add(val);
    });
  }

  // Year facet
  var yearParam = params.get("year");
  if (yearParam) {
    yearParam.split(",").forEach(function (v) {
      var val = v.trim();
      if (val) selectedYears.add(val);
    });
  }

  // Search query
  var qParam = params.get("q");
  if (qParam) {
    searchQuery = normalizeSearchQuery(qParam);
    var searchInput = document.getElementById("projectSearchInput");
    if (searchInput) searchInput.value = qParam;
  }

  // Date range
  var fromParam = params.get("from");
  var toParam = params.get("to");
  var dateStart = document.getElementById("projectDateStart");
  var dateEnd = document.getElementById("projectDateEnd");
  if (fromParam && dateStart) {
    dateStart.value = fromParam;
  }
  if (toParam && dateEnd) {
    dateEnd.value = toParam;
  }
  if (fromParam || toParam) {
    applyDateRangeFromInputs();
  }
}

// F3: Sync current filter state to URL without page reload
function syncUrlParams() {
  var params = new URLSearchParams(window.location.search);

  // Preserve lang param if present
  if (selectedTypes.size > 0) {
    params.set(
      "type",
      Array.from(selectedTypes).map(encodeURIComponent).join(","),
    );
  } else {
    params.delete("type");
  }

  if (selectedYears.size > 0) {
    params.set("year", Array.from(selectedYears).join(","));
  } else {
    params.delete("year");
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  } else {
    params.delete("q");
  }

  var dateStart = document.getElementById("projectDateStart");
  var dateEnd = document.getElementById("projectDateEnd");
  var fromVal = dateStart ? dateStart.value : "";
  var toVal = dateEnd ? dateEnd.value : "";

  if (fromVal) {
    params.set("from", fromVal);
  } else {
    params.delete("from");
  }

  if (toVal) {
    params.set("to", toVal);
  } else {
    params.delete("to");
  }

  var search = params.toString() ? "?" + params.toString() : "";
  history.replaceState(
    null,
    "",
    window.location.pathname + search + window.location.hash,
  );
}

// F2: Parse #project=<id> from location.hash
function parseHashProjectId() {
  var hash = window.location.hash;
  if (!hash || hash.indexOf("#project=") !== 0) return null;
  var encoded = hash.slice("#project=".length);
  if (!encoded) return null;
  return decodeProjectId(encoded);
}

async function loadData() {
  try {
    const loadConfig = getDataLoadConfig();
    var lang = KEII18n.getLang();
    setProjectsListState(
      createLoadingStateElement(KEII18n.t("loading.data", lang)),
    );
    document.getElementById("dataFile").textContent =
      loadConfig.dataFilePath.split("/").pop() || "projects.xlsx";

    const response = await fetch(loadConfig.dataFilePath);
    if (!response.ok) {
      throw {
        code: "DATA_FETCH_FAILED",
        message: `Could not load workbook file (HTTP ${response.status}).`,
        details: {
          dataFilePath: loadConfig.dataFilePath,
          httpStatus: response.status,
        },
      };
    }

    if (
      !window.KEIDataContract ||
      typeof window.KEIDataContract.parseWorkbookFromArrayBuffer !== "function"
    ) {
      throw {
        code: "PARSER_UNAVAILABLE",
        message: "Data parser is unavailable. Refresh the page and retry.",
        details: {},
      };
    }

    const fileLastModified = response.headers.get("Last-Modified");
    const arrayBuffer = await response.arrayBuffer();
    const parsedData = window.KEIDataContract.parseWorkbookFromArrayBuffer(
      arrayBuffer,
      XLSX,
      {
        sheetName: "List",
        headerScanLimit: loadConfig.headerScanDepth,
      },
    );

    allProjects = parsedData.projects.map((project) => ({
      ...project,
      projectStart: formatDate(project.projectStart),
      projectEnd: formatDate(project.projectEnd),
    }));

    const fieldsMap = new Map();
    fieldProjectCount = {};
    fieldToOriginalMap.clear();

    allProjects.forEach((project) => {
      [
        { label: project.primaryFocus, key: project.primaryFocusKey },
        { label: project.secondaryFocus, key: project.secondaryFocusKey },
      ].forEach((field) => {
        const displayField = field.label;
        const normalizedKey = field.key || normalizeFieldName(displayField);
        // Defensive: fixtures or older parsed data may still produce empty
        // labels or keys (the contract should already strip 0/"0"). Skip
        // anything that would seed a bogus focus chip.
        if (!displayField || !normalizedKey) return;
        fieldProjectCount[normalizedKey] =
          (fieldProjectCount[normalizedKey] || 0) + 1;
        if (!fieldsMap.has(normalizedKey)) {
          fieldsMap.set(normalizedKey, { original: displayField });
        }
      });
    });

    fieldsMap.forEach((value, key) => {
      fieldToOriginalMap.set(key, value.original);
    });
    researchFields = Array.from(fieldsMap.keys()).sort();

    // F3: Seed filters from URL before first render
    seedFiltersFromUrl();

    filterProjects();

    document.getElementById("totalProjectsCount").textContent =
      allProjects.length;
    document.getElementById("totalFieldsCount").textContent =
      researchFields.length;

    createResearchFieldsGrid();
    renderProjects();
    updateLastUpdateTime(fileLastModified);
    renderFacetChips();

    document.getElementById("serverStatus").textContent = "Ready";
    document.getElementById("serverStatus").style.color = "#00A887";

    // F2: Deep-link — open modal if #project=<id> in hash
    var hashId = parseHashProjectId();
    if (hashId !== null) {
      var found = allProjects.find(function (p) {
        return p.id === hashId;
      });
      if (found) {
        openProjectModal(hashId, true);
      } else {
        showErrorToast(KEII18n.t("modal.notFound", KEII18n.getLang()));
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }
  } catch (error) {
    console.error("Data load error:", error);
    const errorInfo = buildDataLoadErrorInfo(error);
    setProjectsListState(createErrorStateElement(errorInfo));
    document.getElementById("serverStatus").textContent = "Error";
    document.getElementById("serverStatus").style.color = "#e53935";
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  try {
    let date;
    if (typeof dateValue === "number") {
      date = new Date((dateValue - 25569) * 86400 * 1000);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    if (Number.isNaN(date.getTime())) return dateValue.toString();
    var lang =
      typeof KEII18n !== "undefined" && KEII18n.getLang
        ? KEII18n.getLang()
        : "en";
    return date.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US");
  } catch (e) {
    return dateValue.toString();
  }
}

// Chromium picks the date-input picker placeholder from the input's `lang`
// attribute (or its closest ancestor's). Update both the document language
// and the inputs explicitly so KO/EN toggles affect the placeholder text
// without requiring the user to change OS locale.
function applyLangToDateInputs(lang) {
  var resolved = lang === "ko" ? "ko" : "en";
  if (typeof document === "undefined") return;
  if (document.documentElement) {
    document.documentElement.lang = resolved;
  }
  ["projectDateStart", "projectDateEnd"].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.lang = resolved;
  });
}

function createResearchFieldsGrid() {
  var lang = KEII18n.getLang();
  const grid = document.getElementById("researchFieldsGrid");
  grid.replaceChildren();
  researchFields.forEach((field) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "field-card";
    card.dataset.fieldKey = field;
    card.setAttribute("aria-pressed", "false");
    card.addEventListener("click", () => toggleField(field));

    const displayName = fieldToOriginalMap.get(field) || field;
    const count = fieldProjectCount[field] || 0;

    const nameElement = document.createElement("div");
    nameElement.className = "field-name";
    nameElement.textContent = displayName;

    const countElement = document.createElement("div");
    countElement.className = "field-count-badge";
    countElement.textContent =
      count === 1
        ? KEII18n.t("field.card.count.one", lang)
        : KEII18n.t("field.card.count", lang, { count: count });

    card.appendChild(nameElement);
    card.appendChild(countElement);
    grid.appendChild(card);
  });

  // Re-apply selected state
  document.querySelectorAll(".field-card").forEach((card) => {
    const fieldKey = card.dataset.fieldKey || "";
    const isSelected = selectedFields.includes(fieldKey);
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });
}

function toggleField(field) {
  var lang = KEII18n.getLang();
  const idx = selectedFields.indexOf(field);
  const displayName = fieldToOriginalMap.get(field) || field;
  if (idx > -1) selectedFields.splice(idx, 1);
  else selectedFields.push(field);
  updateFieldSelection();
  filterProjects();
  renderProjects();
  var key = idx > -1 ? "announce.filter.removed" : "announce.filter.added";
  announceInteractionStatus(
    KEII18n.t(key, lang, {
      field: displayName,
      count: filteredProjects.length,
    }),
  );
}

function updateFieldSelection() {
  document.querySelectorAll(".field-card").forEach((card) => {
    const fieldKey = card.dataset.fieldKey || "";
    const isSelected = selectedFields.includes(fieldKey);
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  const summary = document.getElementById("selectionSummary");
  const count = document.getElementById("selectedCount");
  const container = document.getElementById("selectedFields");

  if (selectedFields.length > 0) {
    summary.classList.replace("hide", "show");
    count.textContent = selectedFields.length;
    container.replaceChildren();
    selectedFields.forEach((field) => {
      container.appendChild(createSelectedTagElement(field));
    });
  } else {
    summary.classList.replace("show", "hide");
    container.replaceChildren();
  }
}

function createSelectedTagElement(field) {
  const displayName = fieldToOriginalMap.get(field) || field;

  const tag = document.createElement("div");
  tag.className = "selected-tag";
  tag.appendChild(document.createTextNode(displayName));

  const removeTag = document.createElement("button");
  removeTag.type = "button";
  removeTag.className = "remove-tag";
  removeTag.textContent = "✕";
  removeTag.setAttribute("aria-label", `Remove filter ${displayName}`);
  removeTag.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleField(field);
  });

  tag.appendChild(removeTag);
  return tag;
}

function filterProjects() {
  filteredProjects = allProjects.filter(function (project) {
    return (
      projectMatchesSelectedFields(project) &&
      projectMatchesSearch(project) &&
      projectMatchesDateRange(project) &&
      projectMatchesTypeFacet(project) &&
      projectMatchesYearFacet(project)
    );
  });
}

function applySortAndRender() {
  currentSort = document.getElementById("sortSelect").value;
  renderProjects();
}

function getSortedProjects() {
  const arr = [...filteredProjects];
  if (currentSort === "title_asc") {
    arr.sort(compareProjectsByTitle);
  } else if (currentSort === "start_desc") {
    arr.sort((a, b) => compareProjectsByStartDate(a, b, "desc"));
  } else if (currentSort === "start_asc") {
    arr.sort((a, b) => compareProjectsByStartDate(a, b, "asc"));
  }
  return arr;
}

function compareProjectsByStartDate(a, b, direction) {
  const aTs = Number.isFinite(a.projectStartTimestamp)
    ? a.projectStartTimestamp
    : null;
  const bTs = Number.isFinite(b.projectStartTimestamp)
    ? b.projectStartTimestamp
    : null;
  const aHasValidDate = aTs !== null;
  const bHasValidDate = bTs !== null;

  if (aHasValidDate && bHasValidDate && aTs !== bTs) {
    return direction === "desc" ? bTs - aTs : aTs - bTs;
  }

  if (aHasValidDate !== bHasValidDate) {
    return aHasValidDate ? -1 : 1;
  }

  return compareProjectsByTitleThenSource(a, b);
}

function compareProjectsByTitle(a, b) {
  return compareProjectsByTitleThenSource(a, b);
}

function compareProjectsByTitleThenSource(a, b) {
  const titleDiff = titleCollator.compare(a.title || "", b.title || "");
  if (titleDiff !== 0) {
    return titleDiff;
  }

  const sourceRowA = Number.isInteger(a.sourceRowIndex)
    ? a.sourceRowIndex
    : Number.MAX_SAFE_INTEGER;
  const sourceRowB = Number.isInteger(b.sourceRowIndex)
    ? b.sourceRowIndex
    : Number.MAX_SAFE_INTEGER;
  if (sourceRowA !== sourceRowB) {
    return sourceRowA - sourceRowB;
  }

  const idA = String(a.id ?? "");
  const idB = String(b.id ?? "");
  return titleCollator.compare(idA, idB);
}

function renderProjects() {
  const renderToken = activeRenderToken + 1;
  activeRenderToken = renderToken;
  void renderProjectsAsync(renderToken);
}

async function renderProjectsAsync(renderToken) {
  var lang = KEII18n.getLang();
  const container = document.getElementById("projectsList");
  const resultsCount = document.getElementById("resultsCount");
  const downloadBtn = document.getElementById("downloadBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");

  if (filteredProjects.length === 0) {
    resultsCount.textContent = KEII18n.t("results.count.projects.zero", lang);
    container.replaceChildren(createEmptyStateElement());
    downloadBtn.disabled = true;
    downloadExcelBtn.disabled = true;
    return;
  }

  const sorted = getSortedProjects();
  resultsCount.textContent = KEII18n.t("results.count.projects", lang, {
    count: filteredProjects.length,
  });

  const projectList = document.createElement("div");
  projectList.className = "projects-list";

  const useBatchedRendering =
    sorted.length >= performanceConfig.largeRenderThreshold;
  if (useBatchedRendering) {
    container.replaceChildren(
      createLoadingStateElement(
        KEII18n.t("loading.rendering", lang, { count: sorted.length }),
      ),
    );
    await nextAnimationFrame();
    if (renderToken !== activeRenderToken) {
      return;
    }
  }

  for (let i = 0; i < sorted.length; i += performanceConfig.renderBatchSize) {
    if (renderToken !== activeRenderToken) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const batch = sorted.slice(i, i + performanceConfig.renderBatchSize);
    batch.forEach((project) => {
      fragment.appendChild(createProjectCard(project));
    });
    projectList.appendChild(fragment);

    if (useBatchedRendering) {
      await nextAnimationFrame();
    }
  }

  if (renderToken !== activeRenderToken) {
    return;
  }

  container.replaceChildren(projectList);
  updateDownloadButtons();
}

function encodeProjectId(projectId) {
  return encodeURIComponent(JSON.stringify(projectId));
}

function decodeProjectId(encodedProjectId) {
  try {
    return JSON.parse(decodeURIComponent(encodedProjectId));
  } catch (e) {
    return null;
  }
}

function getProjectIdFromCheckbox(checkbox) {
  const encodedProjectId = checkbox.getAttribute("data-project-id");
  if (!encodedProjectId) return null;
  return decodeProjectId(encodedProjectId);
}

function createProjectMetaItem(label, value) {
  const metaItem = document.createElement("div");
  metaItem.className = "meta-item";

  const labelElement = document.createElement("span");
  labelElement.className = "meta-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "meta-value";
  valueElement.textContent = value;

  metaItem.appendChild(labelElement);
  metaItem.appendChild(valueElement);
  return metaItem;
}

function createFocusBadge(className, value) {
  const badge = document.createElement("span");
  badge.className = `focus-badge ${className}`;
  badge.textContent = value;
  return badge;
}

function createProjectCard(project) {
  var lang = KEII18n.getLang();
  const isSelected = selectedProjects.has(project.id);
  const encodedProjectId = encodeProjectId(project.id);
  const card = document.createElement("div");
  card.className = "project-card";
  if (isSelected) {
    card.classList.add("selected");
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "project-checkbox";
  checkbox.setAttribute("data-project-id", encodedProjectId);
  checkbox.setAttribute(
    "aria-label",
    `Select project ${project.title || project.id}`,
  );
  checkbox.checked = isSelected;
  checkbox.addEventListener("change", () => {
    toggleProjectSelectionFromCheckbox(checkbox);
  });

  // F2: title is a clickable element for opening the modal
  const titleBtn = document.createElement("button");
  titleBtn.type = "button";
  titleBtn.className = "project-title project-title-btn";
  titleBtn.setAttribute("data-project-title-id", encodeProjectId(project.id));
  titleBtn.textContent = project.title || "";
  titleBtn.addEventListener("click", function () {
    titleBtn.focus();
    openProjectModal(project.id);
  });

  const projectMeta = document.createElement("div");
  projectMeta.className = "project-meta";

  if (project.pi) {
    projectMeta.appendChild(
      createProjectMetaItem(KEII18n.t("card.field.pi", lang), project.pi),
    );
  }

  if (project.projectStart || project.projectEnd) {
    const period = `${project.projectStart || ""}${project.projectStart && project.projectEnd ? " – " : ""}${project.projectEnd || ""}`;
    projectMeta.appendChild(
      createProjectMetaItem(KEII18n.t("card.field.period", lang), period),
    );
  }

  if (project.type) {
    projectMeta.appendChild(
      createProjectMetaItem(KEII18n.t("card.field.type", lang), project.type),
    );
  }

  const projectBadges = document.createElement("div");
  projectBadges.className = "project-badges";

  if (project.primaryFocus) {
    projectBadges.appendChild(
      createFocusBadge("badge-primary", project.primaryFocus),
    );
  }

  if (project.secondaryFocus) {
    projectBadges.appendChild(
      createFocusBadge("badge-secondary", project.secondaryFocus),
    );
  }

  card.appendChild(checkbox);
  card.appendChild(titleBtn);
  card.appendChild(projectMeta);
  card.appendChild(projectBadges);
  return card;
}

function toggleProjectSelection(projectId) {
  if (selectedProjects.has(projectId)) selectedProjects.delete(projectId);
  else selectedProjects.add(projectId);
  const selector = `.project-checkbox[data-project-id="${encodeProjectId(projectId)}"]`;
  const checkbox = document.querySelector(selector);
  if (checkbox) {
    checkbox.checked = selectedProjects.has(projectId);
    const card = checkbox.closest(".project-card");
    if (card) {
      card.classList.toggle("selected", selectedProjects.has(projectId));
    }
  }
  updateDownloadButtons();
}

function toggleProjectSelectionFromCheckbox(checkbox) {
  var lang = KEII18n.getLang();
  const projectId = getProjectIdFromCheckbox(checkbox);
  if (projectId === null) return;
  if (checkbox.checked) selectedProjects.add(projectId);
  else selectedProjects.delete(projectId);
  const card = checkbox.closest(".project-card");
  if (card) {
    card.classList.toggle("selected", checkbox.checked);
  }
  updateDownloadButtons();

  const titleEl = card ? card.querySelector(".project-title") : null;
  const title = titleEl ? titleEl.textContent : "";
  var key = checkbox.checked
    ? "announce.project.selected"
    : "announce.project.deselected";
  announceInteractionStatus(
    KEII18n.t(key, lang, {
      title: title || projectId,
      count: selectedProjects.size,
    }),
  );
}

function selectAllProjects() {
  var lang = KEII18n.getLang();
  filteredProjects.forEach((p) => {
    selectedProjects.add(p.id);
  });
  updateProjectCardStyles();
  updateDownloadButtons();
  announceInteractionStatus(
    KEII18n.t("announce.select.all", lang, {
      count: filteredProjects.length,
    }),
  );
}

function clearProjectSelection() {
  var lang = KEII18n.getLang();
  selectedProjects.clear();
  updateProjectCardStyles();
  updateDownloadButtons();
  announceInteractionStatus(KEII18n.t("announce.select.cleared", lang));
}

function updateProjectCardStyles() {
  document.querySelectorAll(".project-checkbox").forEach((cb) => {
    const id = getProjectIdFromCheckbox(cb);
    if (id === null) return;
    const card = cb.closest(".project-card");
    cb.checked = selectedProjects.has(id);
    card.classList.toggle("selected", selectedProjects.has(id));
  });
}

function updateDownloadButtons() {
  const n = selectedProjects.size;
  document.getElementById("selectedProjectCount").textContent = n;
  document.getElementById("selectedProjectCountPDF").textContent = n;
  setPdfExportControlsState(isPdfExportInProgress);
}

function clearSelection() {
  var lang = KEII18n.getLang();
  selectedFields = [];
  selectedProjects.clear();
  updateFieldSelection();
  filterProjects();
  renderProjects();
  announceInteractionStatus(KEII18n.t("announce.selection.cleared", lang));
}

function refreshData() {
  var lang = KEII18n.getLang();
  setProjectsListState(
    createLoadingStateElement(KEII18n.t("loading.refreshing", lang)),
  );
  loadData();
}

function showToast(message) {
  const existing = document.querySelector(".success-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "success-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function downloadExcel() {
  var lang = KEII18n.getLang();
  if (selectedProjects.size === 0) return;
  try {
    const list = allProjects.filter((p) => selectedProjects.has(p.id));
    const wb = XLSX.utils.book_new();
    const wsData = [
      [
        "No.",
        "Title",
        "PI",
        "Primary Focus",
        "Secondary Focus",
        "Type",
        "Project Start",
        "Project End",
      ],
    ];
    list.forEach((p, i) => {
      wsData.push([
        i + 1,
        p.title,
        p.pi,
        p.primaryFocus,
        p.secondaryFocus,
        p.type,
        p.projectStart,
        p.projectEnd,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 60 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "KEI Projects");

    const fieldNames = selectedFields.map(
      (f) => fieldToOriginalMap.get(f) || f,
    );
    const exportDate = new Date().toLocaleDateString(
      lang === "ko" ? "ko-KR" : "en-US",
    );
    const metaData = [
      [
        KEII18n.t("export.institute", lang) +
          " — " +
          KEII18n.t("export.title", lang),
      ],
      [""],
      [KEII18n.t("export.date.label", lang), exportDate],
      [KEII18n.t("export.count.label", lang), list.length],
      [
        KEII18n.t("export.focus.label", lang),
        fieldNames.length > 0
          ? fieldNames.join(", ")
          : KEII18n.t("export.all.fields", lang),
      ],
    ];
    const metaWs = XLSX.utils.aoa_to_sheet(metaData);
    metaWs["!cols"] = [{ wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

    const fname = `KEI_Projects_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(KEII18n.t("excel.downloading", lang, { count: list.length }));
  } catch (e) {
    console.error(e);
    showErrorToast(KEII18n.t("excel.failed", lang));
  }
}

function createPdfHeaderElement(projectCount) {
  var lang = KEII18n.getLang();
  const headerHost = document.createElement("div");
  headerHost.style.cssText =
    "position:absolute;left:-9999px;top:0;width:540px;background:#fff;font-family:Inter,sans-serif;padding:10px";

  const headerBox = document.createElement("div");
  headerBox.style.cssText =
    "text-align:center;margin-bottom:16px;padding:12px 0;border-bottom:2px solid #00A887";

  const institute = document.createElement("div");
  institute.style.cssText =
    "color:#00A887;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px";
  institute.textContent = KEII18n.t("export.institute", lang);

  const title = document.createElement("div");
  title.style.cssText =
    "color:#2d3a40;font-size:20px;font-weight:700;margin-bottom:6px";
  title.textContent = KEII18n.t("export.title", lang);

  headerBox.appendChild(institute);
  headerBox.appendChild(title);

  if (selectedFields.length > 0) {
    const selectedFieldNames = selectedFields.map(
      (field) => fieldToOriginalMap.get(field) || field,
    );
    const focus = document.createElement("div");
    focus.style.cssText = "color:#555;font-size:12px";
    focus.textContent = KEII18n.t("export.focus.prefix", lang, {
      fields: selectedFieldNames.join(", "),
    });
    headerBox.appendChild(focus);
  }

  const exportMeta = document.createElement("div");
  exportMeta.style.cssText = "color:#888;font-size:11px;margin-top:4px";
  exportMeta.textContent = `${new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US")} · ${projectCount} ${KEII18n.t("stat.projects.label", lang)}`;
  headerBox.appendChild(exportMeta);

  headerHost.appendChild(headerBox);
  return headerHost;
}

function createPdfMetaItem(label, value) {
  const item = document.createElement("span");

  const labelElement = document.createElement("b");
  labelElement.style.cssText =
    "color:#7a95a8;text-transform:uppercase;font-size:10px";
  labelElement.textContent = label;

  item.appendChild(labelElement);
  item.appendChild(document.createTextNode(` ${value}`));
  return item;
}

function createPdfBadge(value, styles) {
  const badge = document.createElement("span");
  badge.style.cssText = styles;
  badge.textContent = value;
  return badge;
}

function createPdfProjectCardElement(project) {
  var lang = KEII18n.getLang();
  const cardHost = document.createElement("div");
  cardHost.style.cssText =
    "position:absolute;left:-9999px;top:0;width:540px;background:#fff;font-family:Inter,sans-serif";

  const card = document.createElement("div");
  card.style.cssText =
    "border:1px solid #dde8ec;border-left:4px solid #00A887;border-radius:8px;padding:12px 14px;margin:0;background:#fff";

  const title = document.createElement("div");
  title.style.cssText =
    "font-size:13px;font-weight:600;color:#2d3a40;margin-bottom:8px;line-height:1.4";
  title.textContent = project.title || "";
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.style.cssText =
    "display:flex;gap:20px;font-size:11px;color:#555;margin-bottom:8px";

  if (project.pi) {
    meta.appendChild(
      createPdfMetaItem(KEII18n.t("card.field.pi", lang), project.pi),
    );
  }
  if (project.projectStart) {
    meta.appendChild(
      createPdfMetaItem(
        KEII18n.t("card.field.period", lang),
        `${project.projectStart} – ${project.projectEnd || ""}`,
      ),
    );
  }
  if (project.type) {
    meta.appendChild(
      createPdfMetaItem(KEII18n.t("card.field.type", lang), project.type),
    );
  }

  card.appendChild(meta);

  const badges = document.createElement("div");
  badges.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";

  if (project.primaryFocus) {
    badges.appendChild(
      createPdfBadge(
        project.primaryFocus,
        "background:#e0f8f4;color:#007a63;border:1px solid #7dd4c8;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600",
      ),
    );
  }
  if (project.secondaryFocus) {
    badges.appendChild(
      createPdfBadge(
        project.secondaryFocus,
        "background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600",
      ),
    );
  }

  card.appendChild(badges);
  cardHost.appendChild(card);
  return cardHost;
}

async function downloadPDF() {
  var lang = KEII18n.getLang();
  if (selectedProjects.size === 0) return;
  if (isPdfExportInProgress) {
    showErrorToast(KEII18n.t("pdf.busy", lang));
    return;
  }

  isPdfExportInProgress = true;
  setPdfExportControlsState(true);

  try {
    setPdfExportProgress(0, selectedProjects.size);

    if (typeof html2canvas === "undefined")
      throw new Error("html2canvas not loaded.");
    let jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) throw new Error("jsPDF not loaded.");

    const list = allProjects.filter((p) => selectedProjects.has(p.id));
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pdfW - margin * 2;

    const hEl = createPdfHeaderElement(list.length);
    let hCanvas;
    document.body.appendChild(hEl);
    try {
      hCanvas = await withTimeout(
        html2canvas(hEl, { scale: 2, useCORS: true, backgroundColor: "#fff" }),
        performanceConfig.pdfExportTimeoutMs,
        `PDF export timed out after ${performanceConfig.pdfExportTimeoutMs}ms while rendering the export header.`,
      );
    } finally {
      if (hEl.parentNode) {
        document.body.removeChild(hEl);
      }
    }
    const hH = (hCanvas.height * cw) / hCanvas.width;
    pdf.addImage(hCanvas.toDataURL("image/png"), "PNG", margin, margin, cw, hH);
    let y = margin + hH + 5;

    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      setPdfExportProgress(i + 1, list.length);
      const cEl = createPdfProjectCardElement(p);
      let cCanvas;
      document.body.appendChild(cEl);
      try {
        cCanvas = await withTimeout(
          html2canvas(cEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#fff",
          }),
          performanceConfig.pdfExportTimeoutMs,
          `PDF export timed out after ${performanceConfig.pdfExportTimeoutMs}ms while rendering project ${i + 1}.`,
        );
      } finally {
        if (cEl.parentNode) {
          document.body.removeChild(cEl);
        }
      }
      const cH = (cCanvas.height * cw) / cCanvas.width;
      if (y + cH > pdfH - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.addImage(cCanvas.toDataURL("image/png"), "PNG", margin, y, cw, cH);
      y += cH + 4;

      if ((i + 1) % 5 === 0) {
        await nextAnimationFrame();
      }
    }

    pdf.save(`KEI_Projects_${new Date().toISOString().split("T")[0]}.pdf`);
    setPdfExportStatus(
      KEII18n.t("pdf.complete", lang, { count: list.length }),
      false,
    );
    showToast(KEII18n.t("pdf.downloading", lang, { count: list.length }));
  } catch (e) {
    console.error(e);
    const message = e && e.message ? e.message : KEII18n.t("pdf.busy", lang);
    setPdfExportStatus(message, true);
    showErrorToast(message);
  } finally {
    isPdfExportInProgress = false;
    setPdfExportControlsState(false);
  }
}

function updateLastUpdateTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  document.getElementById("lastUpdate").textContent = localizedDate(d);
}

function getFocusableInteractiveElements() {
  const selectors = [
    "button:not(:disabled)",
    "input:not(:disabled)",
    "select:not(:disabled)",
    "textarea:not(:disabled)",
    "[href]",
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(document.querySelectorAll(selectors.join(","))).filter(
    (element) => {
      return element instanceof HTMLElement && element.offsetParent !== null;
    },
  );
}

function maintainTabCycle(event) {
  if (event.key !== "Tab") {
    return;
  }

  // If modal is open, let modal focus trap handle it
  var modal = document.getElementById("projectModal");
  if (modal && !modal.hidden) {
    return;
  }

  const focusableElements = getFocusableInteractiveElements();
  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    maintainTabCycle(e);
    return;
  }

  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.ctrlKey && e.key === "a") {
    e.preventDefault();
    selectedFields = [...researchFields];
    updateFieldSelection();
    filterProjects();
    renderProjects();
  }
  if (e.ctrlKey && e.key === "d") {
    e.preventDefault();
    clearSelection();
  }
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    if (selectedProjects.size > 0) downloadPDF();
  }
  if (e.ctrlKey && e.key === "e") {
    e.preventDefault();
    if (selectedProjects.size > 0) downloadExcel();
  }
  if (e.key === "F5") {
    e.preventDefault();
    refreshData();
  }
});

// ─── F2: Modal ────────────────────────────────────────────────────────────────

function formatDuration(startTs, endTs, lang) {
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return "";
  var startDate = new Date(startTs);
  var endDate = new Date(endTs);
  var totalMonths =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());
  if (totalMonths < 0) totalMonths = 0;
  var years = Math.floor(totalMonths / 12);
  var months = totalMonths % 12;
  if (lang === "ko") {
    var parts = [];
    if (years > 0) parts.push(years + "년");
    if (months > 0) parts.push(months + "개월");
    return parts.length > 0 ? parts.join(" ") : "0개월";
  }
  var enParts = [];
  if (years > 0) enParts.push(years + (years === 1 ? " year" : " years"));
  if (months > 0) enParts.push(months + (months === 1 ? " month" : " months"));
  return enParts.length > 0 ? enParts.join(" ") : "0 months";
}

// F2 attachments: only allow http/https absolute URLs and same-origin
// relative paths under data/. Anything else (javascript:, data:, file://)
// is dropped so the link is rendered hidden — the modal still opens.
function isSafeAttachmentHref(value) {
  if (!value || typeof value !== "string") return false;
  var trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data\//.test(trimmed) || /^\.?\/?data\//.test(trimmed)) return true;
  return false;
}

function applyProjectAttachments(project) {
  var wrap = document.getElementById("projectModalAttachments");
  var thumbAnchor = document.getElementById("projectModalThumbLink");
  var thumbImg = document.getElementById("projectModalThumb");
  var pdfLink = document.getElementById("projectModalPdfLink");
  var sourceLink = document.getElementById("projectModalSourceLink");
  if (!wrap || !thumbAnchor || !thumbImg || !pdfLink || !sourceLink) return;

  var thumb = isSafeAttachmentHref(project.thumbnail) ? project.thumbnail : "";
  var pdf = isSafeAttachmentHref(project.pdfPath) ? project.pdfPath : "";
  var source = isSafeAttachmentHref(project.sourceUrl) ? project.sourceUrl : "";

  if (thumb) {
    thumbImg.src = thumb;
    thumbImg.alt = project.title || "";
    // Clicking the thumbnail prefers PDF then original, falling back to the
    // image itself so it always does something useful.
    thumbAnchor.href = pdf || source || thumb;
    thumbAnchor.hidden = false;
  } else {
    thumbImg.removeAttribute("src");
    thumbImg.alt = "";
    thumbAnchor.removeAttribute("href");
    thumbAnchor.hidden = true;
  }

  if (pdf) {
    pdfLink.href = pdf;
    pdfLink.hidden = false;
  } else {
    pdfLink.removeAttribute("href");
    pdfLink.hidden = true;
  }

  if (source) {
    sourceLink.href = source;
    sourceLink.hidden = false;
  } else {
    sourceLink.removeAttribute("href");
    sourceLink.hidden = true;
  }

  wrap.hidden = !(thumb || pdf || source);
}

// skipHashUpdate=true when called from popstate to avoid double-pushing history
function openProjectModal(projectId, skipHashUpdate) {
  var project = allProjects.find(function (p) {
    return p.id === projectId;
  });
  var lang = KEII18n.getLang();
  if (!project) {
    showErrorToast(KEII18n.t("modal.notFound", lang));
    return;
  }

  currentModalProjectId = projectId;
  lastFocusBeforeModal = document.activeElement;

  var modal = document.getElementById("projectModal");
  document.getElementById("projectModalType").textContent = project.type || "";
  document.getElementById("projectModalTitle").textContent =
    project.title || "";
  document.getElementById("projectModalPi").textContent = project.pi || "";

  var periodText = "";
  if (project.projectStartTimestamp || project.projectEndTimestamp) {
    var startStr = Number.isFinite(project.projectStartTimestamp)
      ? localizedDate(project.projectStartTimestamp)
      : "";
    var endStr = Number.isFinite(project.projectEndTimestamp)
      ? localizedDate(project.projectEndTimestamp)
      : "";
    periodText =
      startStr && endStr ? startStr + " – " + endStr : startStr || endStr;
  }
  document.getElementById("projectModalPeriod").textContent = periodText;

  var durationText = "";
  if (
    Number.isFinite(project.projectStartTimestamp) &&
    Number.isFinite(project.projectEndTimestamp)
  ) {
    durationText = formatDuration(
      project.projectStartTimestamp,
      project.projectEndTimestamp,
      lang,
    );
  }
  document.getElementById("projectModalDuration").textContent = durationText;

  document.getElementById("projectModalPrimary").textContent =
    project.primaryFocus || "";
  document.getElementById("projectModalSecondary").textContent =
    project.secondaryFocus || "";

  applyProjectAttachments(project);

  modal.hidden = false;

  // F2: Update URL hash to reflect open modal
  if (!skipHashUpdate) {
    var encodedId = encodeProjectId(projectId);
    history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        "#project=" +
        encodedId,
    );
  }

  var card = modal.querySelector(".project-modal-card");
  if (card) {
    card.focus();
  }
}

// skipHashUpdate=true when called from popstate
function closeProjectModal(skipHashUpdate) {
  var modal = document.getElementById("projectModal");
  if (!modal) return;

  // Restore focus BEFORE hiding the modal so the card (display:none parent)
  // does not auto-blur the activeElement to body before focus() lands.
  if (lastFocusBeforeModal && document.body.contains(lastFocusBeforeModal)) {
    lastFocusBeforeModal.focus();
  }

  modal.hidden = true;
  currentModalProjectId = null;

  // F2: Clear hash when modal closes
  if (!skipHashUpdate) {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }

  lastFocusBeforeModal = null;
}

// F2: Clipboard helper — tries navigator.clipboard, falls back to execCommand
function writeToClipboard(text) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback: textarea + execCommand
  return new Promise(function (resolve, reject) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      // ignore
    }
    document.body.removeChild(ta);
    if (ok) {
      resolve();
    } else {
      reject(new Error("execCommand copy failed"));
    }
  });
}

// F2: Copy project deep-link to clipboard
function copyProjectLink(projectId) {
  var lang = KEII18n.getLang();
  var encodedId = encodeProjectId(projectId);
  var url = location.origin + location.pathname + "#project=" + encodedId;
  writeToClipboard(url)
    .then(function () {
      var msg = KEII18n.t("modal.copyLink.success", lang);
      showToast(msg);
      announceInteractionStatus(msg);
    })
    .catch(function () {
      showErrorToast(KEII18n.t("modal.copyLink.fail", lang));
    });
}

// F2: Copy localized project citation to clipboard
function copyProjectCitation(projectId) {
  var lang = KEII18n.getLang();
  var project = allProjects.find(function (p) {
    return p.id === projectId;
  });
  if (!project) {
    showErrorToast(KEII18n.t("modal.notFound", lang));
    return;
  }

  var unknownYear = KEII18n.t("modal.citation.unknownYear", lang);
  var startYear = Number.isFinite(project.projectStartTimestamp)
    ? String(new Date(project.projectStartTimestamp).getUTCFullYear())
    : null;
  var endYear = Number.isFinite(project.projectEndTimestamp)
    ? String(new Date(project.projectEndTimestamp).getUTCFullYear())
    : null;

  if (!startYear && !endYear) {
    startYear = unknownYear;
    endYear = unknownYear;
  } else if (!startYear) {
    startYear = endYear;
  } else if (!endYear) {
    endYear = startYear;
  }

  var citation = KEII18n.t("modal.citation.template", lang, {
    pi: project.pi || "",
    startYear: startYear,
    endYear: endYear,
    title: project.title || "",
    id: String(projectId),
  });

  writeToClipboard(citation)
    .then(function () {
      var msg = KEII18n.t("modal.copyCitation.success", lang);
      showToast(msg);
      announceInteractionStatus(msg);
    })
    .catch(function () {
      showErrorToast(KEII18n.t("modal.copyCitation.fail", lang));
    });
}

// ─── F3: Facets ───────────────────────────────────────────────────────────────

function deriveFacets(projects) {
  var typeSet = {};
  var yearSet = {};

  projects.forEach(function (p) {
    if (p.type) {
      typeSet[p.type] = (typeSet[p.type] || 0) + 1;
    }
    var ts = Number.isFinite(p.projectStartTimestamp)
      ? p.projectStartTimestamp
      : Number.isFinite(p.projectEndTimestamp)
        ? p.projectEndTimestamp
        : null;
    if (ts !== null) {
      var yr = String(new Date(ts).getUTCFullYear());
      yearSet[yr] = (yearSet[yr] || 0) + 1;
    }
  });

  var types = Object.keys(typeSet).sort();
  var years = Object.keys(yearSet).sort(function (a, b) {
    return Number(b) - Number(a);
  });

  return {
    types: types.map(function (v) {
      return { value: v };
    }),
    years: years.map(function (v) {
      return { value: v };
    }),
  };
}

function renderFacetChips() {
  var facets = deriveFacets(allProjects);
  var lang = KEII18n.getLang();

  var typeContainer = document.getElementById("facetTypeChips");
  var yearContainer = document.getElementById("facetYearChips");

  if (!typeContainer || !yearContainer) return;

  typeContainer.replaceChildren();
  yearContainer.replaceChildren();

  facets.types.forEach(function (item) {
    var translatedLabel =
      KEII18n.t("facet.type.value." + item.value, lang) !==
      "facet.type.value." + item.value
        ? KEII18n.t("facet.type.value." + item.value, lang)
        : item.value;
    var count = computeFacetCount("type", item.value);
    var chip = createFacetChip(
      "type",
      item.value,
      translatedLabel,
      count,
      selectedTypes.has(item.value),
    );
    typeContainer.appendChild(chip);
  });

  facets.years.forEach(function (item) {
    var count = computeFacetCount("year", item.value);
    var chip = createFacetChip(
      "year",
      item.value,
      item.value,
      count,
      selectedYears.has(item.value),
    );
    yearContainer.appendChild(chip);
  });
}

function createFacetChip(facetType, value, label, count, isPressed) {
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "facet-chip";
  btn.setAttribute("data-facet-type", facetType);
  btn.setAttribute("data-facet-value", value);
  btn.setAttribute("aria-pressed", isPressed ? "true" : "false");

  var labelNode = document.createTextNode(label + " ");
  var countSpan = document.createElement("span");
  countSpan.className = "facet-count";
  countSpan.textContent = "(" + count + ")";

  btn.appendChild(labelNode);
  btn.appendChild(countSpan);

  btn.addEventListener("click", function () {
    var lang = KEII18n.getLang();
    var wasSelected;
    if (facetType === "type") {
      wasSelected = selectedTypes.has(value);
      if (wasSelected) selectedTypes.delete(value);
      else selectedTypes.add(value);
    } else {
      wasSelected = selectedYears.has(value);
      if (wasSelected) selectedYears.delete(value);
      else selectedYears.add(value);
    }
    filterProjects();
    renderProjects();
    renderFacetChips();
    syncUrlParams();
    var announceKey = wasSelected
      ? "facet.announce.removed"
      : "facet.announce.added";
    announceInteractionStatus(KEII18n.t(announceKey, lang, { value: label }));
  });

  return btn;
}

window.clearSelection = clearSelection;
window.applySortAndRender = applySortAndRender;
window.selectAllProjects = selectAllProjects;
window.clearProjectSelection = clearProjectSelection;
window.downloadExcel = downloadExcel;
window.downloadPDF = downloadPDF;
window.refreshData = refreshData;
window.loadData = loadData;
window.toggleProjectSelection = toggleProjectSelection;
window.toggleProjectSelectionFromCheckbox = toggleProjectSelectionFromCheckbox;
window.toggleField = toggleField;
window.getFilterStateSnapshot = getFilterStateSnapshot;
window.openProjectModal = openProjectModal;
window.closeProjectModal = closeProjectModal;
