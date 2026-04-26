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

document.addEventListener("DOMContentLoaded", function () {
  initializeResultsToolbarControls();
  updateServerStatus();
  loadData();
});

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
    setDateRangeFeedback("End date must be on or after start date.");
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
    announceInteractionStatus(
      "Invalid date range. End date must be on or after start date.",
    );
    return;
  }

  filterProjects();
  renderProjects();
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
  if (totalItems <= 0) {
    setPdfExportStatus("Preparing PDF export…", false);
    return;
  }
  const clampedCurrent = Math.min(Math.max(currentIndex, 0), totalItems);
  const percent = Math.round((clampedCurrent / totalItems) * 100);
  setPdfExportStatus(
    `Generating PDF ${clampedCurrent}/${totalItems} (${percent}%)`,
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
  const details = errorInfo.details || {};
  const items = [];

  if (
    Array.isArray(details.missingHeaders) &&
    details.missingHeaders.length > 0
  ) {
    items.push("Missing headers: " + details.missingHeaders.join(", "));
  }

  if (
    Array.isArray(details.availableSheets) &&
    details.availableSheets.length > 0
  ) {
    items.push("Available sheets: " + details.availableSheets.join(", "));
  }

  if (typeof details.headerRowNumber === "number") {
    items.push("Detected header row: " + details.headerRowNumber);
  }

  if (typeof details.headerScanDepth === "number") {
    items.push("Header scan depth: " + details.headerScanDepth + " row(s)");
  }

  if (details.sheetName) {
    items.push("Expected sheet: '" + details.sheetName + "'");
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
  const errorState = document.createElement("div");
  errorState.className = "error-state";

  const title = document.createElement("h3");
  title.textContent = "Failed to load data";

  const code = document.createElement("p");
  code.className = "error-code";
  code.textContent = "Error code: " + (errorInfo.code || "DATA_LOAD_FAILED");

  const detail = document.createElement("p");
  detail.textContent = errorInfo.message;

  const contextItems = createParserErrorContextItems(errorInfo);

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "btn btn-outline";
  retryButton.style.marginTop = "12px";
  retryButton.textContent = "Try Again";
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
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#00A887" stroke-width="2"/>
            <path d="M16 24h16M24 16v16" stroke="#00A887" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No projects found</h3>
        <p>Try adjusting focus, search, or date filters.</p>`;
  return emptyState;
}

async function loadData() {
  try {
    const loadConfig = getDataLoadConfig();
    setProjectsListState(createLoadingStateElement("Loading project data…"));
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
        if (displayField) {
          fieldProjectCount[normalizedKey] =
            (fieldProjectCount[normalizedKey] || 0) + 1;
          if (!fieldsMap.has(normalizedKey)) {
            fieldsMap.set(normalizedKey, { original: displayField });
          }
        }
      });
    });

    fieldsMap.forEach((value, key) => {
      fieldToOriginalMap.set(key, value.original);
    });
    researchFields = Array.from(fieldsMap.keys()).sort();
    filterProjects();

    document.getElementById("totalProjectsCount").textContent =
      allProjects.length;
    document.getElementById("totalFieldsCount").textContent =
      researchFields.length;

    createResearchFieldsGrid();
    renderProjects();
    updateLastUpdateTime(fileLastModified);

    document.getElementById("serverStatus").textContent = "Ready";
    document.getElementById("serverStatus").style.color = "#00A887";
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
    return date.toLocaleDateString("en-US");
  } catch (e) {
    return dateValue.toString();
  }
}

function createResearchFieldsGrid() {
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
    countElement.textContent = `${count} project${count !== 1 ? "s" : ""}`;

    card.appendChild(nameElement);
    card.appendChild(countElement);
    grid.appendChild(card);
  });
}

function toggleField(field) {
  const idx = selectedFields.indexOf(field);
  const displayName = fieldToOriginalMap.get(field) || field;
  if (idx > -1) selectedFields.splice(idx, 1);
  else selectedFields.push(field);
  updateFieldSelection();
  filterProjects();
  renderProjects();
  announceInteractionStatus(
    `${displayName} filter ${idx > -1 ? "removed" : "selected"}. ${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""} shown.`,
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
      projectMatchesDateRange(project)
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
  const container = document.getElementById("projectsList");
  const resultsCount = document.getElementById("resultsCount");
  const downloadBtn = document.getElementById("downloadBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");

  if (filteredProjects.length === 0) {
    resultsCount.textContent = "0 projects";
    container.replaceChildren(createEmptyStateElement());
    downloadBtn.disabled = true;
    downloadExcelBtn.disabled = true;
    return;
  }

  const sorted = getSortedProjects();
  resultsCount.textContent = `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""}`;

  const projectList = document.createElement("div");
  projectList.className = "projects-list";

  const useBatchedRendering =
    sorted.length >= performanceConfig.largeRenderThreshold;
  if (useBatchedRendering) {
    container.replaceChildren(
      createLoadingStateElement(`Rendering ${sorted.length} projects…`),
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

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = project.title || "";

  const projectMeta = document.createElement("div");
  projectMeta.className = "project-meta";

  if (project.pi) {
    projectMeta.appendChild(createProjectMetaItem("PI", project.pi));
  }

  if (project.projectStart || project.projectEnd) {
    const period = `${project.projectStart || ""}${project.projectStart && project.projectEnd ? " – " : ""}${project.projectEnd || ""}`;
    projectMeta.appendChild(createProjectMetaItem("Period", period));
  }

  if (project.type) {
    projectMeta.appendChild(createProjectMetaItem("Type", project.type));
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
  card.appendChild(title);
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
  const projectId = getProjectIdFromCheckbox(checkbox);
  if (projectId === null) return;
  if (checkbox.checked) selectedProjects.add(projectId);
  else selectedProjects.delete(projectId);
  const card = checkbox.closest(".project-card");
  if (card) {
    card.classList.toggle("selected", checkbox.checked);
  }
  updateDownloadButtons();

  const title = card ? card.querySelector(".project-title")?.textContent : "";
  announceInteractionStatus(
    `Project ${title || projectId} ${checkbox.checked ? "selected" : "deselected"}. ${selectedProjects.size} selected.`,
  );
}

function selectAllProjects() {
  filteredProjects.forEach((p) => {
    selectedProjects.add(p.id);
  });
  updateProjectCardStyles();
  updateDownloadButtons();
  announceInteractionStatus(
    `Selected all ${filteredProjects.length} visible projects.`,
  );
}

function clearProjectSelection() {
  selectedProjects.clear();
  updateProjectCardStyles();
  updateDownloadButtons();
  announceInteractionStatus("Cleared all selected projects.");
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
  selectedFields = [];
  selectedProjects.clear();
  updateFieldSelection();
  filterProjects();
  renderProjects();
  announceInteractionStatus(
    "Cleared all focus filters and project selections.",
  );
}

function refreshData() {
  setProjectsListState(createLoadingStateElement("Refreshing…"));
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
    const metaData = [
      ["KEI Research Projects Export"],
      [""],
      ["Export Date:", new Date().toLocaleDateString("en-US")],
      ["Total Projects:", list.length],
      [
        "Selected Focus:",
        fieldNames.length > 0 ? fieldNames.join(", ") : "All Fields",
      ],
    ];
    const metaWs = XLSX.utils.aoa_to_sheet(metaData);
    metaWs["!cols"] = [{ wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

    const fname = `KEI_Projects_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(`Excel downloaded — ${list.length} projects`);
  } catch (e) {
    console.error(e);
    alert("Excel export failed. Please try again.");
  }
}

function createPdfHeaderElement(projectCount) {
  const headerHost = document.createElement("div");
  headerHost.style.cssText =
    "position:absolute;left:-9999px;top:0;width:540px;background:#fff;font-family:Inter,sans-serif;padding:10px";

  const headerBox = document.createElement("div");
  headerBox.style.cssText =
    "text-align:center;margin-bottom:16px;padding:12px 0;border-bottom:2px solid #00A887";

  const institute = document.createElement("div");
  institute.style.cssText =
    "color:#00A887;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px";
  institute.textContent = "Korea Environment Institute";

  const title = document.createElement("div");
  title.style.cssText =
    "color:#2d3a40;font-size:20px;font-weight:700;margin-bottom:6px";
  title.textContent = "Research Project Export";

  headerBox.appendChild(institute);
  headerBox.appendChild(title);

  if (selectedFields.length > 0) {
    const selectedFieldNames = selectedFields.map(
      (field) => fieldToOriginalMap.get(field) || field,
    );
    const focus = document.createElement("div");
    focus.style.cssText = "color:#555;font-size:12px";
    focus.textContent = `Focus: ${selectedFieldNames.join(", ")}`;
    headerBox.appendChild(focus);
  }

  const exportMeta = document.createElement("div");
  exportMeta.style.cssText = "color:#888;font-size:11px;margin-top:4px";
  exportMeta.textContent = `${new Date().toLocaleDateString("en-US")} · ${projectCount} Projects`;
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
    meta.appendChild(createPdfMetaItem("PI", project.pi));
  }
  if (project.projectStart) {
    meta.appendChild(
      createPdfMetaItem(
        "Period",
        `${project.projectStart} – ${project.projectEnd || ""}`,
      ),
    );
  }
  if (project.type) {
    meta.appendChild(createPdfMetaItem("Type", project.type));
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
  if (selectedProjects.size === 0) return;
  if (isPdfExportInProgress) {
    showErrorToast(
      "PDF export is already running. Please wait for completion.",
    );
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
    setPdfExportStatus(`PDF export complete (${list.length} projects)`, false);
    showToast(`PDF downloaded — ${list.length} projects`);
  } catch (e) {
    console.error(e);
    const message =
      e && e.message ? e.message : "PDF export failed. Please try again.";
    setPdfExportStatus(message, true);
    showErrorToast(message);
  } finally {
    isPdfExportInProgress = false;
    setPdfExportControlsState(false);
  }
}

function updateLastUpdateTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  document.getElementById("lastUpdate").textContent =
    d.toLocaleDateString("en-US");
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
