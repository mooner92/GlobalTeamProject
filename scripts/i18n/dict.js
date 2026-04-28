(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KEII18n = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var ko = {
    "header.title": "연구 프로젝트 탐색기",
    "header.toggle.label": "English",
    "header.toggle.aria": "영어로 전환",

    "hero.headline": "KEI 연구 포트폴리오 탐색",
    "hero.description":
      "분야별 연구 프로젝트를 탐색하고 KEI가 한국과 세계의 환경 정책을 어떻게 발전시키고 있는지 알아보세요.",

    "stat.projects.label": "연구 프로젝트",
    "stat.areas.label": "연구 분야",

    "focus.panel.title": "연구 중점 분야",
    "focus.clear.label": "선택 초기화",
    "focus.summary.filtering": "개 분야로 필터링 중",

    "search.label": "프로젝트 제목 또는 PI 검색",
    "search.placeholder": "제목 또는 PI 검색",
    "search.aria": "프로젝트 제목 또는 PI 검색",

    "date.start.label": "프로젝트 시작일",
    "date.start.aria": "프로젝트 시작일",
    "date.end.label": "프로젝트 종료일",
    "date.end.aria": "프로젝트 종료일",
    "date.separator": "~",
    "date.group.aria": "프로젝트 날짜 범위 필터",

    "sort.label": "프로젝트 정렬",
    "sort.aria": "프로젝트 정렬",
    "sort.option.default": "기본 순서",
    "sort.option.title_asc": "제목 (가 → 나)",
    "sort.option.start_desc": "최신순",
    "sort.option.start_asc": "오래된순",

    "results.info.showing": "표시 중",
    "results.count.aria": "프로젝트 수",
    "results.count.projects": "{count}개 프로젝트",
    "results.count.projects.zero": "0개 프로젝트",

    "btn.selectAll": "전체 선택",
    "btn.deselectAll": "전체 해제",
    "btn.excel": "↓ Excel",
    "btn.pdf": "↓ PDF",
    "btn.refresh": "↺",
    "btn.refresh.title": "데이터 새로 고침",
    "btn.refresh.aria": "프로젝트 데이터 새로 고침",

    "footer.copyright": "© 한국환경연구원. All rights reserved.",
    "footer.status.label": "상태:",
    "footer.data.label": "데이터:",
    "footer.updated.label": "업데이트:",

    "lang.switched.ko": "언어가 한국어로 전환되었습니다",
    "lang.switched.en": "언어가 영어로 전환되었습니다",

    "modal.close.aria": "모달 닫기",
    "modal.field.pi": "PI",
    "modal.field.period": "기간",
    "modal.field.duration": "소요 기간",
    "modal.field.primaryFocus": "주요 분야",
    "modal.field.secondaryFocus": "부 분야",
    "modal.action.copyLink": "링크 복사",
    "modal.action.copyCitation": "인용 복사",
    "modal.action.close": "닫기",
    "modal.action.openPdf": "PDF 열기",
    "modal.action.openSource": "원문 보기",
    "modal.attachment.thumbnail.aria": "프로젝트 자료 열기",
    "modal.notFound": "프로젝트를 찾을 수 없습니다",
    "modal.copyLink.success": "링크가 클립보드에 복사되었습니다",
    "modal.copyLink.fail": "링크 복사에 실패했습니다",
    "modal.copyCitation.success": "인용이 클립보드에 복사되었습니다",
    "modal.copyCitation.fail": "인용 복사에 실패했습니다",
    "modal.citation.template":
      "{pi} ({startYear}–{endYear}). 《{title}》. 한국환경연구원 연구과제 No. {id}.",
    "modal.citation.unknownYear": "연도 미상",

    "facet.type.label": "유형",
    "facet.type.aria": "프로젝트 유형 필터",
    "facet.year.label": "연도",
    "facet.year.aria": "프로젝트 연도 필터",
    "facet.reset": "필터 초기화",
    "facet.announce.added": "{value} 필터가 추가되었습니다",
    "facet.announce.removed": "{value} 필터가 제거되었습니다",

    "card.field.pi": "PI",
    "card.field.period": "기간",
    "card.field.type": "유형",
    "card.project.count": "{count}개 프로젝트",
    "card.project.count.one": "1개 프로젝트",

    "field.card.count": "{count}개 프로젝트",
    "field.card.count.one": "1개 프로젝트",

    "loading.data": "프로젝트 데이터 로딩 중…",
    "loading.rendering": "{count}개 프로젝트 렌더링 중…",
    "loading.refreshing": "새로 고침 중…",

    "empty.title": "프로젝트를 찾을 수 없습니다",
    "empty.hint": "분야, 검색어 또는 날짜 필터를 조정해 보세요.",

    "error.title": "데이터를 불러오지 못했습니다",
    "error.code.label": "오류 코드: {code}",
    "error.retry": "다시 시도",
    "error.missing.headers": "누락된 헤더: {list}",
    "error.available.sheets": "사용 가능한 시트: {list}",
    "error.detected.row": "감지된 헤더 행: {row}",
    "error.scan.depth": "헤더 스캔 깊이: {depth}행",
    "error.expected.sheet": "예상 시트: '{name}'",

    "pdf.preparing": "PDF 내보내기 준비 중…",
    "pdf.progress": "PDF 생성 중 {current}/{total} ({percent}%)",
    "pdf.complete": "PDF 내보내기 완료 ({count}개 프로젝트)",
    "pdf.downloading": "PDF 다운로드됨 — {count}개 프로젝트",
    "pdf.busy":
      "PDF 내보내기가 이미 실행 중입니다. 완료될 때까지 기다려 주세요.",

    "excel.downloading": "Excel 다운로드됨 — {count}개 프로젝트",
    "excel.failed": "Excel 내보내기에 실패했습니다. 다시 시도해 주세요.",

    "export.institute": "한국환경연구원",
    "export.title": "연구 프로젝트 내보내기",
    "export.date.label": "내보내기 날짜:",
    "export.count.label": "총 프로젝트:",
    "export.focus.label": "선택된 분야:",
    "export.all.fields": "전체 분야",
    "export.focus.prefix": "분야: {fields}",

    "toast.date.invalid":
      "날짜 범위가 올바르지 않습니다. 종료일은 시작일 이후여야 합니다.",

    "announce.filter.added":
      "{field} 필터가 선택되었습니다. {count}개 프로젝트가 표시됩니다.",
    "announce.filter.removed":
      "{field} 필터가 해제되었습니다. {count}개 프로젝트가 표시됩니다.",
    "announce.select.all": "표시된 {count}개 프로젝트를 모두 선택했습니다.",
    "announce.select.cleared": "선택된 모든 프로젝트를 해제했습니다.",
    "announce.selection.cleared":
      "모든 분야 필터와 프로젝트 선택을 해제했습니다.",
    "announce.project.selected":
      "프로젝트 {title} 선택됨. 총 {count}개 선택됨.",
    "announce.project.deselected":
      "프로젝트 {title} 선택 해제됨. 총 {count}개 선택됨.",
  };

  var en = {
    "header.title": "Research Project Explorer",
    "header.toggle.label": "한국어",
    "header.toggle.aria": "Switch to Korean",

    "hero.headline": "Explore KEI's Research Portfolio",
    "hero.description":
      "Browse research projects by focus area and discover how KEI is advancing environmental policy in Korea and beyond.",

    "stat.projects.label": "Research Projects",
    "stat.areas.label": "Research Areas",

    "focus.panel.title": "Research Focus Areas",
    "focus.clear.label": "Clear Selection",
    "focus.summary.filtering": "area(s)",

    "search.label": "Search by project title or PI",
    "search.placeholder": "Search title or PI",
    "search.aria": "Search by project title or PI",

    "date.start.label": "Project date start",
    "date.start.aria": "Project date start",
    "date.end.label": "Project date end",
    "date.end.aria": "Project date end",
    "date.separator": "to",
    "date.group.aria": "Project date range filter",

    "sort.label": "Sort projects",
    "sort.aria": "Sort projects",
    "sort.option.default": "Default Order",
    "sort.option.title_asc": "Title (A → Z)",
    "sort.option.start_desc": "Newest First",
    "sort.option.start_asc": "Oldest First",

    "results.info.showing": "Showing",
    "results.count.aria": "project count",
    "results.count.projects": "{count} projects",
    "results.count.projects.zero": "0 projects",

    "btn.selectAll": "Select All",
    "btn.deselectAll": "Deselect All",
    "btn.excel": "↓ Excel",
    "btn.pdf": "↓ PDF",
    "btn.refresh": "↺",
    "btn.refresh.title": "Refresh data",
    "btn.refresh.aria": "Refresh project data",

    "footer.copyright": "© Korea Environment Institute. All rights reserved.",
    "footer.status.label": "Status:",
    "footer.data.label": "Data:",
    "footer.updated.label": "Updated:",

    "lang.switched.ko": "Language switched to Korean",
    "lang.switched.en": "Language switched to English",

    "modal.close.aria": "Close modal",
    "modal.field.pi": "PI",
    "modal.field.period": "Period",
    "modal.field.duration": "Duration",
    "modal.field.primaryFocus": "Primary Focus",
    "modal.field.secondaryFocus": "Secondary Focus",
    "modal.action.copyLink": "Copy link",
    "modal.action.copyCitation": "Copy citation",
    "modal.action.close": "Close",
    "modal.action.openPdf": "Open PDF",
    "modal.action.openSource": "Open original",
    "modal.attachment.thumbnail.aria": "Open project material",
    "modal.notFound": "Project not found",
    "modal.copyLink.success": "Link copied to clipboard",
    "modal.copyLink.fail": "Failed to copy link",
    "modal.copyCitation.success": "Citation copied to clipboard",
    "modal.copyCitation.fail": "Failed to copy citation",
    "modal.citation.template":
      "{pi} ({startYear}–{endYear}). {title}. Korea Environment Institute Research Project No. {id}.",
    "modal.citation.unknownYear": "n.d.",

    "facet.type.label": "Type",
    "facet.type.aria": "Filter by project type",
    "facet.year.label": "Year",
    "facet.year.aria": "Filter by project year",
    "facet.reset": "Reset",
    "facet.announce.added": "{value} filter added",
    "facet.announce.removed": "{value} filter removed",

    "card.field.pi": "PI",
    "card.field.period": "Period",
    "card.field.type": "Type",
    "card.project.count": "{count} projects",
    "card.project.count.one": "1 project",

    "field.card.count": "{count} projects",
    "field.card.count.one": "1 project",

    "loading.data": "Loading project data…",
    "loading.rendering": "Rendering {count} projects…",
    "loading.refreshing": "Refreshing…",

    "empty.title": "No projects found",
    "empty.hint": "Try adjusting focus, search, or date filters.",

    "error.title": "Failed to load data",
    "error.code.label": "Error code: {code}",
    "error.retry": "Try Again",
    "error.missing.headers": "Missing headers: {list}",
    "error.available.sheets": "Available sheets: {list}",
    "error.detected.row": "Detected header row: {row}",
    "error.scan.depth": "Header scan depth: {depth} row(s)",
    "error.expected.sheet": "Expected sheet: '{name}'",

    "pdf.preparing": "Preparing PDF export…",
    "pdf.progress": "Generating PDF {current}/{total} ({percent}%)",
    "pdf.complete": "PDF export complete ({count} projects)",
    "pdf.downloading": "PDF downloaded — {count} projects",
    "pdf.busy": "PDF export is already running. Please wait for completion.",

    "excel.downloading": "Excel downloaded — {count} projects",
    "excel.failed": "Excel export failed. Please try again.",

    "export.institute": "Korea Environment Institute",
    "export.title": "Research Project Export",
    "export.date.label": "Export Date:",
    "export.count.label": "Total Projects:",
    "export.focus.label": "Selected Focus:",
    "export.all.fields": "All Fields",
    "export.focus.prefix": "Focus: {fields}",

    "toast.date.invalid":
      "Invalid date range. End date must be on or after start date.",

    "announce.filter.added":
      "{field} filter selected. {count} project(s) shown.",
    "announce.filter.removed":
      "{field} filter removed. {count} project(s) shown.",
    "announce.select.all": "Selected all {count} visible projects.",
    "announce.select.cleared": "Cleared all selected projects.",
    "announce.selection.cleared":
      "Cleared all focus filters and project selections.",
    "announce.project.selected": "Project {title} selected. {count} selected.",
    "announce.project.deselected":
      "Project {title} deselected. {count} selected.",
  };

  function getLang() {
    var urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang === "ko" || urlLang === "en") {
      return urlLang;
    }
    var stored = null;
    try {
      stored = localStorage.getItem("kei.lang");
    } catch (e) {
      // ignore
    }
    if (stored === "ko" || stored === "en") {
      return stored;
    }
    return "en";
  }

  function setLang(lang) {
    if (lang !== "ko" && lang !== "en") {
      return;
    }
    try {
      localStorage.setItem("kei.lang", lang);
    } catch (e) {
      // ignore
    }
  }

  function t(key, lang, params) {
    var dict = lang === "ko" ? ko : en;
    var value = dict[key];
    if (value === undefined) {
      value = en[key];
    }
    if (value === undefined) {
      return key;
    }
    if (params && typeof params === "object") {
      var keys = Object.keys(params);
      for (var i = 0; i < keys.length; i++) {
        var placeholder = "{" + keys[i] + "}";
        value = value.split(placeholder).join(String(params[keys[i]]));
      }
    }
    return value;
  }

  function applyLang(lang) {
    var resolvedLang = lang;

    // URL param wins on first call
    var urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang === "ko" || urlLang === "en") {
      resolvedLang = urlLang;
      try {
        localStorage.setItem("kei.lang", resolvedLang);
      } catch (e) {
        // ignore
      }
    }

    if (resolvedLang !== "ko" && resolvedLang !== "en") {
      resolvedLang = "en";
    }

    document.documentElement.lang = resolvedLang === "ko" ? "ko" : "en";

    // Walk data-i18n elements (textContent)
    var i18nEls = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < i18nEls.length; i++) {
      var el = i18nEls[i];
      var key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = t(key, resolvedLang);
      }
    }

    // Walk data-i18n-attr elements (attribute updates)
    var attrEls = document.querySelectorAll("[data-i18n-attr]");
    for (var j = 0; j < attrEls.length; j++) {
      var attrEl = attrEls[j];
      var attrName = attrEl.getAttribute("data-i18n-attr");
      if (!attrName) continue;
      var attrKey = attrEl.getAttribute("data-i18n-" + attrName);
      if (attrKey) {
        attrEl.setAttribute(attrName, t(attrKey, resolvedLang));
      }
    }

    // Walk shorthand data-i18n-placeholder elements
    var placeholderEls = document.querySelectorAll("[data-i18n-placeholder]");
    for (var k = 0; k < placeholderEls.length; k++) {
      var phEl = placeholderEls[k];
      var phKey = phEl.getAttribute("data-i18n-placeholder");
      if (phKey) {
        phEl.setAttribute("placeholder", t(phKey, resolvedLang));
      }
    }

    // Walk shorthand data-i18n-title elements
    var titleEls = document.querySelectorAll("[data-i18n-title]");
    for (var m = 0; m < titleEls.length; m++) {
      var titleEl = titleEls[m];
      var titleKey = titleEl.getAttribute("data-i18n-title");
      if (titleKey) {
        titleEl.setAttribute("title", t(titleKey, resolvedLang));
      }
    }

    // Update lang toggle aria-pressed
    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.setAttribute(
        "aria-pressed",
        resolvedLang === "ko" ? "true" : "false",
      );
    }

    document.dispatchEvent(
      new CustomEvent("kei:langchanged", { detail: { lang: resolvedLang } }),
    );
  }

  return {
    ko: ko,
    en: en,
    t: t,
    getLang: getLang,
    setLang: setLang,
    applyLang: applyLang,
  };
});
