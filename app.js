const STORAGE_KEY = "course-studio-v1";
const LESSON_TYPES = [
  "Welcome",
  "Video",
  "Article",
  "Workshop",
  "Interactive",
  "Shadowing",
  "Quiz",
  "Reflection",
];

const state = {
  courses: [],
  selectedCourseId: null,
};

const courseListEl = document.querySelector("#course-list");
const courseFormEl = document.querySelector("#course-form");
const sectionsEl = document.querySelector("#sections");
const previewEl = document.querySelector("#preview");
const statusPillEl = document.querySelector("#status-pill");
const toastEl = document.querySelector("#toast");

init();

function init() {
  state.courses = loadCourses();
  if (!state.courses.length) {
    state.courses = [createSampleCourse()];
  }
  state.selectedCourseId = state.courses[0]?.id ?? null;

  courseFormEl.addEventListener("input", handleCourseFormChange);
  courseFormEl.addEventListener("change", handleCourseFormChange);
  sectionsEl.addEventListener("input", handleSectionInput);
  sectionsEl.addEventListener("change", handleSectionInput);
  sectionsEl.addEventListener("click", handleSectionClick);
  courseListEl.addEventListener("click", handleCourseListClick);

  document
    .querySelector("#new-course")
    .addEventListener("click", handleCreateCourse);
  document
    .querySelector("#add-section")
    .addEventListener("click", handleAddSection);
  document
    .querySelector("#export-plan")
    .addEventListener("click", handleExport);

  render();
}

function render() {
  renderCourseList();
  renderCourseForm();
  renderSections();
  renderPreview();
  updateStatusPill();
}

function loadCourses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((course) => ({
      ...course,
      sections: (course.sections || []).map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) => ({ ...lesson })),
      })),
    }));
  } catch (error) {
    console.error("Failed to load courses", error);
    return [];
  }
}

function saveCourses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.courses));
  } catch (error) {
    console.error("Failed to save courses", error);
  }
}

function handleCreateCourse() {
  const newCourse = createBlankCourse();
  state.courses.unshift(newCourse);
  state.selectedCourseId = newCourse.id;
  saveCourses();
  render();
  showToast("New course created. Start customizing the journey!");
}

function handleCourseListClick(event) {
  const deleteButton = event.target.closest("button[data-action]");
  if (deleteButton) {
    const { action, courseId } = deleteButton.dataset;
    if (action === "delete-course") {
      event.stopPropagation();
      deleteCourse(courseId);
      return;
    }
  }

  const card = event.target.closest("[data-course-id]");
  if (!card) return;
  const { courseId } = card.dataset;
  if (courseId === state.selectedCourseId) return;
  state.selectedCourseId = courseId;
  render();
}

function deleteCourse(courseId) {
  const index = state.courses.findIndex((course) => course.id === courseId);
  if (index === -1) return;
  const [removed] = state.courses.splice(index, 1);
  if (removed?.id === state.selectedCourseId) {
    state.selectedCourseId = state.courses[0]?.id ?? null;
  }
  saveCourses();
  render();
  showToast("Course removed from your studio.");
}

function handleAddSection() {
  const course = getSelectedCourse();
  if (!course) return;
  const section = createBlankSection();
  course.sections.push(section);
  saveCourses();
  renderSections();
  renderCourseList();
  renderPreview();
  updateStatusPill();
  showToast("Section added — add lessons to bring it to life.");
}

function handleCourseFormChange(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const course = getSelectedCourse();
  if (!course) return;
  let value = event.target.value;
  if (event.target.type === "number") {
    value = value === "" ? "" : Number(value);
  }
  course[field] = value;
  saveCourses();
  if (field === "title" || field === "audience") {
    renderCourseList();
  }
  renderPreview();
  updateStatusPill();
}

function handleSectionInput(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const course = getSelectedCourse();
  if (!course) return;
  const sectionId = event.target.dataset.sectionId;
  const lessonId = event.target.dataset.lessonId;
  if (!sectionId) return;
  const section = course.sections.find((item) => item.id === sectionId);
  if (!section) return;

  if (!lessonId) {
    section[field] = event.target.value;
  } else {
    const lesson = section.lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    let value = event.target.value;
    if (event.target.type === "number") {
      value = value === "" ? "" : Number(value);
    }
    lesson[field] = value;
  }

  saveCourses();
  if (lessonId && field === "type") {
    const lessonEl = event.target.closest(".lesson");
    if (lessonEl) {
      lessonEl.setAttribute("data-type", event.target.value || "Lesson");
    }
  }

  if (field === "duration" || !lessonId) {
    updateSectionMeta(sectionId);
  }

  renderCourseList();
  renderPreview();
  updateStatusPill();
}

function handleSectionClick(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;
  const { action, sectionId, lessonId } = actionButton.dataset;
  const course = getSelectedCourse();
  if (!course) return;
  const section = course.sections.find((item) => item.id === sectionId);
  if (!section) return;

  if (action === "add-lesson") {
    const lesson = createBlankLesson();
    section.lessons.push(lesson);
    saveCourses();
    renderSections();
    renderCourseList();
    renderPreview();
    updateStatusPill();
    showToast("New activity added to this section.");
    return;
  }

  if (action === "remove-section") {
    course.sections = course.sections.filter((item) => item.id !== sectionId);
    saveCourses();
    renderSections();
    renderCourseList();
    renderPreview();
    updateStatusPill();
    showToast("Section removed.");
    return;
  }

  if (action === "remove-lesson") {
    section.lessons = section.lessons.filter((item) => item.id !== lessonId);
    saveCourses();
    renderSections();
    renderCourseList();
    renderPreview();
    updateStatusPill();
    showToast("Lesson removed from the journey.");
    return;
  }

  if (action === "duplicate-lesson") {
    const original = section.lessons.find((item) => item.id === lessonId);
    if (!original) return;
    const duplicate = {
      ...structuredCloneSafe(original),
      id: createId(),
      title: `${original.title} (Copy)`,
    };
    section.lessons.push(duplicate);
    saveCourses();
    renderSections();
    renderCourseList();
    renderPreview();
    showToast("Lesson duplicated for quick tweaks.");
  }
}

function handleExport() {
  const course = getSelectedCourse();
  if (!course) {
    showToast("Create or select a course to export.");
    return;
  }
  const markdown = toMarkdown(course);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(markdown)
      .then(() => showToast("Course blueprint copied to clipboard!"))
      .catch(() => downloadPlan(markdown));
  } else {
    downloadPlan(markdown);
  }
}

function downloadPlan(content) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "course-plan.md";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("Course plan downloaded as Markdown.");
}

function renderCourseList() {
  if (!state.courses.length) {
    courseListEl.innerHTML = `<div class="empty-state">Create your first course to begin.</div>`;
    return;
  }

  courseListEl.innerHTML = state.courses
    .map((course) => {
      const totalLessons = course.sections.reduce(
        (sum, section) => sum + section.lessons.length,
        0,
      );
      const totalMinutes = course.sections.reduce(
        (sum, section) =>
          sum +
          section.lessons.reduce(
            (lessonSum, lesson) => lessonSum + Number(lesson.duration || 0),
            0,
          ),
        0,
      );
      const isActive = course.id === state.selectedCourseId;
      return `
        <article class="course-card${isActive ? " active" : ""}" data-course-id="${escapeHtml(
          course.id,
        )}">
          <div>
            <h3>${escapeHtml(course.title || "Untitled onboarding")}</h3>
            <p>${escapeHtml(course.audience || "Audience TBD")}</p>
          </div>
          <div class="course-meta">
            <span>${course.sections.length} sections • ${totalLessons} lessons</span>
            <span>${totalMinutes} mins</span>
          </div>
          <button
            class="button small ghost"
            data-action="delete-course"
            data-course-id="${escapeHtml(course.id)}"
            type="button"
          >
            Remove
          </button>
        </article>
      `;
    })
    .join("");
}

function renderCourseForm() {
  const course = getSelectedCourse();
  const fields = courseFormEl.querySelectorAll("[data-field]");
  if (!course) {
    fields.forEach((field) => {
      field.value = "";
      field.disabled = true;
    });
    courseFormEl.classList.add("disabled");
    return;
  }

  courseFormEl.classList.remove("disabled");
  fields.forEach((field) => {
    const key = field.dataset.field;
    field.disabled = false;
    const value = course[key];
    if (field.type === "number") {
      field.value = value === "" || value == null ? "" : value;
    } else {
      field.value = value ?? "";
    }
  });
}

function renderSections() {
  const course = getSelectedCourse();
  if (!course) {
    sectionsEl.innerHTML = `<div class="empty-state">Select a course to design its learning path.</div>`;
    return;
  }

  if (!course.sections.length) {
    sectionsEl.innerHTML = `<div class="empty-state">Add your first section to kick off the curriculum.</div>`;
    return;
  }

  sectionsEl.innerHTML = course.sections
    .map((section, index) => {
      const sectionDuration = section.lessons.reduce(
        (sum, lesson) => sum + Number(lesson.duration || 0),
        0,
      );
      const safeSectionId = escapeHtml(section.id);
      const lessonsMarkup = section.lessons
        .map((lesson, lessonIndex) =>
          renderLesson(section.id, lesson, lessonIndex),
        )
        .join("");
      return `
        <div class="section" data-section-id="${safeSectionId}">
          <div class="section-header">
            <input
              type="text"
              class="section-title"
              placeholder="Section title"
              value="${escapeHtml(section.title || `Section ${index + 1}`)}"
              data-field="title"
              data-section-id="${safeSectionId}"
            />
            <div class="section-actions">
              <button
                class="button small ghost"
                data-action="remove-section"
                data-section-id="${safeSectionId}"
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
          <div class="section-meta">${section.lessons.length} lessons • ${sectionDuration} mins</div>
          <div class="lessons">
            ${lessonsMarkup || '<p class="section-meta">No activities yet. Add one below.</p>'}
          </div>
          <button
            class="button small outline"
            data-action="add-lesson"
            data-section-id="${safeSectionId}"
            type="button"
          >
            + Add activity
          </button>
        </div>
      `;
    })
    .join("");
}

function renderLesson(sectionId, lesson, index) {
  const safeSectionId = escapeHtml(sectionId);
  const safeLessonId = escapeHtml(lesson.id);
  return `
    <article class="lesson" data-type="${escapeHtml(lesson.type || "Lesson")}">
      <div class="lesson-row">
        <input
          type="text"
          placeholder="Lesson ${index + 1} title"
          value="${escapeHtml(lesson.title || "")}"
          data-field="title"
          data-section-id="${safeSectionId}"
          data-lesson-id="${safeLessonId}"
        />
        <select
          data-field="type"
          data-section-id="${safeSectionId}"
          data-lesson-id="${safeLessonId}"
        >
          ${LESSON_TYPES.map(
            (type) => `
              <option value="${escapeHtml(type)}"${lesson.type === type ? " selected" : ""}>${escapeHtml(type)}</option>
            `,
          ).join("")}
        </select>
        <input
          type="number"
          min="0"
          step="5"
          placeholder="mins"
          value="${escapeHtml(lesson.duration ?? "")}"
          data-field="duration"
          data-section-id="${safeSectionId}"
          data-lesson-id="${safeLessonId}"
        />
      </div>
      <textarea
        rows="3"
        placeholder="What happens in this activity?"
        data-field="summary"
        data-section-id="${safeSectionId}"
        data-lesson-id="${safeLessonId}"
      >${escapeHtml(lesson.summary || "")}</textarea>
      <textarea
        rows="2"
        placeholder="Resources or links learners should explore"
        data-field="resources"
        data-section-id="${safeSectionId}"
        data-lesson-id="${safeLessonId}"
      >${escapeHtml(lesson.resources || "")}</textarea>
      <div class="lesson-actions">
        <button
          class="button small ghost"
          data-action="duplicate-lesson"
          data-section-id="${safeSectionId}"
          data-lesson-id="${safeLessonId}"
          type="button"
        >
          Duplicate
        </button>
        <button
          class="button small ghost"
          data-action="remove-lesson"
          data-section-id="${safeSectionId}"
          data-lesson-id="${safeLessonId}"
          type="button"
        >
          Delete
        </button>
      </div>
    </article>
  `;
}

function renderPreview() {
  const course = getSelectedCourse();
  if (!course) {
    previewEl.innerHTML = `<div class="empty-state">Select a course to see the participant preview.</div>`;
    return;
  }

  const totalMinutes = course.sections.reduce(
    (sum, section) =>
      sum +
      section.lessons.reduce(
        (inner, lesson) => inner + Number(lesson.duration || 0),
        0,
      ),
    0,
  );

  const previewHeader = `
    <div class="preview-card">
      <h3>${escapeHtml(course.title || "Untitled course")}</h3>
      <div class="preview-meta">
        <span><strong>Audience:</strong> ${escapeHtml(course.audience || "TBD")}</span>
        <span><strong>Duration:</strong> ${course.duration || "?"} hrs planned • ${totalMinutes} mins detailed</span>
      </div>
      <p>${formatMultiline(course.welcome || "Welcome message coming soon!")}</p>
    </div>
  `;

  const goalsCard = course.goals
    ? `
        <div class="preview-card">
          <h3>Learning outcomes</h3>
          ${formatList(course.goals)}
        </div>
      `
    : "";

  const resourcesCard = course.resources
    ? `
        <div class="preview-card">
          <h3>Key resources</h3>
          ${formatList(course.resources)}
        </div>
      `
    : "";

  const sectionsCards = course.sections.length
    ? course.sections
        .map((section, index) => {
          const lessons = section.lessons.length
            ? section.lessons
                .map((lesson) => {
                  const summary = lesson.summary
                    ? `<p>${formatMultiline(lesson.summary)}</p>`
                    : "";
                  const resources = lesson.resources
                    ? `<p class="preview-meta"><strong>Resources:</strong> ${formatMultiline(
                        lesson.resources,
                      )}</p>`
                    : "";
                  return `
                    <li>
                      <strong>${escapeHtml(lesson.title || "Untitled lesson")}</strong> • ${
                        lesson.duration || 0
                      } mins<br />
                      <em>${escapeHtml(lesson.type || "Lesson")}</em>
                      ${summary}
                      ${resources}
                    </li>
                  `;
                })
                .join("")
            : "<li><em>No activities scheduled yet.</em></li>";
          return `
            <div class="preview-card">
              <h3>${index + 1}. ${escapeHtml(section.title || "Untitled section")}</h3>
              <ul>${lessons}</ul>
            </div>
          `;
        })
        .join("")
    : '<div class="preview-card"><p>No sections added yet. Use the Learning Path panel to start building.</p></div>';

  previewEl.innerHTML =
    previewHeader + goalsCard + resourcesCard + sectionsCards;
}

function updateStatusPill() {
  const course = getSelectedCourse();
  if (!course) {
    statusPillEl.textContent = "No course selected";
    statusPillEl.className = "status-pill draft";
    return;
  }

  const hasSections = course.sections.length > 0;
  const hasLessons = course.sections.every(
    (section) => section.lessons.length > 0,
  );
  const hasDetails = Boolean(course.title && course.welcome && course.goals);

  let status = "Draft";
  let statusClass = "draft";

  if (hasSections && hasLessons && hasDetails) {
    status = "Launch ready";
    statusClass = "ready";
  } else if (hasSections && hasDetails) {
    status = "In review";
    statusClass = "review";
  }

  statusPillEl.textContent = status;
  statusPillEl.className = `status-pill ${statusClass}`;
}

function updateSectionMeta(sectionId) {
  const course = getSelectedCourse();
  if (!course) return;
  const section = course.sections.find((item) => item.id === sectionId);
  if (!section) return;
  const sectionEl = sectionsEl.querySelector(
    `[data-section-id="${escapeSelector(sectionId)}"]`,
  );
  if (!sectionEl) return;
  const totalMinutes = section.lessons.reduce(
    (sum, lesson) => sum + Number(lesson.duration || 0),
    0,
  );
  const metaEl = sectionEl.querySelector(".section-meta");
  if (metaEl) {
    metaEl.textContent = `${section.lessons.length} lessons • ${totalMinutes} mins`;
  }
}

function createBlankCourse() {
  const id = createId();
  return {
    id,
    title: "Untitled onboarding",
    audience: "",
    goals: "",
    resources: "",
    welcome: "",
    duration: "",
    sections: [createBlankSection()],
  };
}

function createBlankSection() {
  return {
    id: createId(),
    title: "New section",
    lessons: [createBlankLesson()],
  };
}

function createBlankLesson() {
  return {
    id: createId(),
    title: "New lesson",
    type: LESSON_TYPES[0],
    duration: 15,
    summary: "",
    resources: "",
  };
}

function createSampleCourse() {
  return {
    id: createId(),
    title: "New Hire Essentials",
    audience: "Colleagues joining the product team",
    goals:
      "- Understand our customers and product vision\n- Navigate the core toolkit confidently\n- Build relationships across the squad",
    resources:
      "- Employee handbook\n- Product demo environment\n- Slack channel #product-academy",
    welcome:
      "Welcome to the team! This two-day experience will help you connect with our mission and gain the confidence to start shipping value.",
    duration: 8,
    sections: [
      {
        id: createId(),
        title: "Kick-off & Culture",
        lessons: [
          {
            id: createId(),
            title: "Live welcome session",
            type: "Workshop",
            duration: 60,
            summary:
              "Meet the leadership team, review our mission, and set expectations for the first month.",
            resources: "Presentation deck\nLeadership bios",
          },
          {
            id: createId(),
            title: "Company scavenger hunt",
            type: "Interactive",
            duration: 40,
            summary:
              "Pair up with another new hire to explore our handbook, wiki, and communication channels.",
            resources: "Employee handbook\nIntranet access",
          },
        ],
      },
      {
        id: createId(),
        title: "Product Deep Dive",
        lessons: [
          {
            id: createId(),
            title: "Product demo walkthrough",
            type: "Video",
            duration: 45,
            summary:
              "Product lead walks through the roadmap, personas, and the value proposition of our flagship solution.",
            resources: "Demo recording\nProduct brief",
          },
          {
            id: createId(),
            title: "Shadow a customer call",
            type: "Shadowing",
            duration: 30,
            summary:
              "Listen in on a recorded discovery call to understand customer challenges.",
            resources: "Recorded Zoom session\nCustomer profile snapshot",
          },
        ],
      },
    ],
  };
}

function getSelectedCourse() {
  return (
    state.courses.find((course) => course.id === state.selectedCourseId) ?? null
  );
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSelector(value) {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return String(value).replace(/([.#:[\],])/g, "\\$1");
}

function formatMultiline(text) {
  return escapeHtml(text).replace(/\n/g, "<br />");
}

function formatList(text) {
  const items = text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) {
    return `<p>${escapeHtml(text)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function toMarkdown(course) {
  const lines = [];
  lines.push(`# ${course.title || "Untitled course"}`);
  lines.push("");
  if (course.audience) {
    lines.push(`**Audience:** ${course.audience}`);
  }
  if (course.duration) {
    lines.push(`**Planned duration:** ${course.duration} hrs`);
  }
  lines.push("");
  if (course.welcome) {
    lines.push(course.welcome);
    lines.push("");
  }
  if (course.goals) {
    lines.push("## Learning outcomes");
    lines.push("");
    lines.push(course.goals);
    lines.push("");
  }
  if (course.resources) {
    lines.push("## Key resources");
    lines.push("");
    lines.push(course.resources);
    lines.push("");
  }
  course.sections.forEach((section, sectionIndex) => {
    lines.push(
      `## ${sectionIndex + 1}. ${section.title || "Untitled section"}`,
    );
    lines.push("");
    section.lessons.forEach((lesson, lessonIndex) => {
      lines.push(
        `${sectionIndex + 1}.${lessonIndex + 1} ${lesson.title || "Untitled lesson"} (${lesson.type || "Lesson"} • ${lesson.duration || 0} mins)`,
      );
      if (lesson.summary) {
        lines.push(`> ${lesson.summary.replace(/\n/g, "\n> ")}`);
      }
      if (lesson.resources) {
        lines.push(`Resources: ${lesson.resources}`);
      }
      lines.push("");
    });
  });
  return lines.join("\n");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
