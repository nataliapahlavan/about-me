/* =========================================================
   Typewriter effect.
   ========================================================= */
(function typewriter() {
  const el = document.getElementById("typed");
  if (!el) return;

  // Edit these phrases to whatever you want to cycle through.
  const phrases = [
    "intelligent systems.",
    "things that learn.",
    "research into real-world tools.",
    "because I love figuring out how things work.",
  ];

  const typeSpeed = 90;    // ms per character while typing
  const deleteSpeed = 45;  // ms per character while deleting
  const holdTime = 1600;   // ms to pause on a full phrase

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const current = phrases[phraseIndex];
    charIndex += deleting ? -1 : 1;
    el.textContent = current.slice(0, charIndex);

    let delay = deleting ? deleteSpeed : typeSpeed;

    if (!deleting && charIndex === current.length) {
      delay = holdTime;
      deleting = true;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 400;
    }
    setTimeout(tick, delay);
  }
  tick();
})();

/* =========================================================
   Pages.
   One page is visible at a time, picked by the URL hash:
     #about  ·  #projects  ·  #projects/<slug>  ·  #experience
   Every page is still in the HTML, so no-JS visitors and
   crawlers see everything stacked.
   ========================================================= */
const site = (function router() {
  const pages = Array.from(document.querySelectorAll(".page[data-page]"));
  const navLinks = document.querySelectorAll(".sidebar-nav a[data-page]");
  const main = document.querySelector(".main");
  const panel = document.querySelector(".project-panel");
  const projects = panel ? Array.from(panel.querySelectorAll(".entry[data-slug]")) : [];
  const baseTitle = document.title;
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Project tabs, built from the entries so there's one source of truth.
  const tabs = projects.map((p) => {
    const a = document.createElement("a");
    a.className = "project-tab";
    a.href = "#projects/" + p.dataset.slug;
    a.textContent = p.dataset.slug;
    if (p.dataset.summary) a.title = p.dataset.summary;
    return a;
  });
  if (tabs.length) {
    const bar = document.createElement("nav");
    bar.className = "project-tabs";
    bar.setAttribute("aria-label", "Projects");
    bar.append(...tabs);
    panel.before(bar);
    panel.classList.add("tabbed");
  }

  let currentPage = null;
  let currentProject = projects.length ? projects[0].dataset.slug : null;

  function render() {
    let [page, sub] = location.hash.replace(/^#\/?/, "").split("/");
    if (!pages.some((p) => p.dataset.page === page)) page = "about"; // incl. old #contact etc.

    pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === page));
    navLinks.forEach((a) =>
      a.dataset.page === page ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")
    );

    if (projects.some((p) => p.dataset.slug === sub)) currentProject = sub;
    projects.forEach((p) => p.classList.toggle("is-active", p.dataset.slug === currentProject));
    tabs.forEach((t, i) =>
      projects[i].dataset.slug === currentProject
        ? t.setAttribute("aria-current", "true")
        : t.removeAttribute("aria-current")
    );

    if (page !== currentPage) {
      if (currentPage !== null && main) main.scrollTop = 0;
      document.title = page === "about" ? baseTitle : "Natalia Pahlavan — " + page;
    }
    currentPage = page;
  }

  function go(route) {
    if (location.hash.replace(/^#/, "") === route) render();
    else location.hash = route;
  }

  function flash(el) {
    el.classList.remove("flash");
    void el.offsetWidth; // restart the animation
    el.classList.add("flash");
  }

  // Show whatever page `el` lives on, then highlight it.
  function reveal(el) {
    if (!el) return;
    const project = el.closest(".entry[data-slug]");
    const page = el.closest(".page[data-page]");
    if (project) go("projects/" + project.dataset.slug);
    else if (page) go(page.dataset.page);

    const target = el.matches(".page") ? null : el.closest(".entry") || el;
    if (!target) return;
    if (!project) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    flash(target);
  }

  window.addEventListener("hashchange", render);
  render();

  return { go, reveal };
})();

/* =========================================================
   Terminal explorer.
   A delight layer on top of the page content: it builds a
   tiny virtual filesystem from the page so you can
   cd / ls / cat / open your way around.
   ========================================================= */
(function terminal() {
  const section = document.getElementById("page-projects");
  if (!section) return;

  const HOME_PATH = "/home/natalia";

  // ---------------------------------------------------------
  // Build the filesystem from the page.
  //   dir  = { type: "dir",  children: {name: node}, el?, summary? }
  //   file = { type: "file", lines: [...], el?, href? }
  // ---------------------------------------------------------
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const slugify = (s) =>
    clean(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dir = (children, extra) => Object.assign({ type: "dir", children: children || {} }, extra);
  const file = (lines, extra) => Object.assign({ type: "file", lines: lines || [] }, extra);

  function entryLines(entry) {
    const lines = [];
    const title = entry.querySelector(".entry-title");
    const date = entry.querySelector(".entry-date");
    if (title) lines.push(clean(title.textContent) + (date ? "  ·  " + clean(date.textContent) : ""));
    entry.querySelectorAll(".entry-desc").forEach((d) => lines.push(clean(d.textContent)));
    const bullets = entry.querySelectorAll(".entry-bullets li");
    if (bullets.length) {
      lines.push("");
      bullets.forEach((li) => lines.push("- " + clean(li.textContent)));
    }
    const award = entry.querySelector(".award-badge");
    if (award) lines.push("", clean(award.textContent));
    return lines;
  }

  function buildFS() {
    const home = dir();

    const aboutPage = document.getElementById("page-about");
    if (aboutPage) {
      const lines = [];
      aboutPage.querySelectorAll(".about-text > p:not(.tagline)").forEach((p, i) => {
        if (i) lines.push("");
        lines.push(clean(p.textContent));
      });
      home.children["about.txt"] = file(lines, { el: aboutPage });
    }

    const edu = document.getElementById("education");
    if (edu) {
      const lines = [];
      edu.querySelectorAll(".entry").forEach((e) => lines.push(...entryLines(e)));
      home.children["education.txt"] = file(lines, { el: edu });
    }

    // ~/projects/<slug>/{README.md, *.url}
    const projects = dir({}, { el: section });
    section.querySelectorAll(".entry[data-slug]").forEach((entry) => {
      const slug = entry.dataset.slug;
      const title = clean((entry.querySelector(".entry-title") || {}).textContent);
      const p = dir({ "README.md": file(entryLines(entry), { el: entry }) }, {
        el: entry,
        summary: entry.dataset.summary || title,
      });
      const seen = new Set();
      entry.querySelectorAll(".talk-link, .entry-links a").forEach((a) => {
        if (seen.has(a.href)) return;
        seen.add(a.href);
        const name = a.classList.contains("talk-link") ? "talk" : slugify(a.textContent) || "link";
        p.children[name + ".url"] = file([a.href], { href: a.href });
      });
      projects.children[slug] = p;
    });
    home.children["projects"] = projects;

    // ~/experience/<company>.txt
    const expPage = document.getElementById("page-experience");
    if (expPage) {
      const exp = dir({}, { el: expPage });
      expPage.querySelectorAll(".entry").forEach((entry) => {
        const at = entry.querySelector(".at");
        const company = at ? clean(at.textContent).replace(/^@\s*/, "") : clean(entry.textContent);
        const acronym = company.match(/\(([^)]+)\)/);
        let name = slugify(acronym ? acronym[1] : company) || "job";
        let n = 2;
        while (exp.children[name + ".txt"]) name = name.replace(/-\d+$/, "") + "-" + n++;
        exp.children[name + ".txt"] = file(entryLines(entry), { el: entry });
      });
      home.children["experience"] = exp;
    }

    const contact = document.getElementById("contact");
    if (contact) {
      const lines = [];
      contact.querySelectorAll(".sidebar-links a").forEach((a) => {
        const isMail = a.href.startsWith("mailto:");
        lines.push((isMail ? "email" : clean(a.textContent)).padEnd(10) + a.href.replace(/^mailto:/, ""));
      });
      home.children["contact.txt"] = file(lines, { el: contact });
    }

    return home;
  }

  const FS = buildFS();
  let cwd = ["projects"]; // path segments below ~
  let prevCwd = cwd.slice();

  // ---------------------------------------------------------
  // Path helpers
  // ---------------------------------------------------------
  function resolve(path, from) {
    path = path || "";
    let segs = /^[~/]/.test(path) ? [] : (from || cwd).slice();
    path.replace(/^~/, "").split("/").forEach((part) => {
      if (!part || part === ".") return;
      if (part === "..") segs.pop();
      else segs.push(part);
    });
    // Walk the tree, matching names case-insensitively.
    let node = FS;
    const real = [];
    for (const s of segs) {
      if (node.type !== "dir") return null;
      const key = Object.keys(node.children).find((k) => k.toLowerCase() === s.toLowerCase());
      if (!key) return null;
      node = node.children[key];
      real.push(key);
    }
    return { node, segs: real };
  }
  const tildePath = (segs) => (segs.length ? "~/" + segs.join("/") : "~");
  const projectBySlug = (name) => resolve("~/projects/" + name.replace(/\/+$/, ""));

  // ---------------------------------------------------------
  // DOM
  // ---------------------------------------------------------
  const term = document.createElement("div");
  term.className = "terminal";
  term.innerHTML = `
    <div class="terminal-bar" aria-hidden="true">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      <span class="terminal-titlebar"></span>
    </div>
    <div class="terminal-body">
      <div class="terminal-log" role="log" aria-live="polite"></div>
      <div class="terminal-inputline">
        <span class="terminal-prompt"></span>
        <input class="terminal-input" type="text" autocomplete="off"
               autocapitalize="off" autocorrect="off" spellcheck="false"
               enterkeyhint="go"
               aria-label="Terminal command input. Type help and press enter." />
      </div>
    </div>`;
  section.appendChild(term);

  const log = term.querySelector(".terminal-log");
  const input = term.querySelector(".terminal-input");
  const promptEl = term.querySelector(".terminal-inputline .terminal-prompt");
  const titleEl = term.querySelector(".terminal-titlebar");

  const promptText = () => "natalia@portfolio " + (cwd.length ? cwd[cwd.length - 1] : "~") + " %";
  function updatePrompt() {
    promptEl.textContent = promptText();
    titleEl.textContent = tildePath(cwd) + " — zsh";
  }

  // ---------------------------------------------------------
  // Output
  // ---------------------------------------------------------
  function print(text, cls) {
    const line = document.createElement("div");
    line.className = "term-line" + (cls ? " " + cls : "");
    line.textContent = text;
    log.appendChild(line);
  }
  function printPrompt(cmd) {
    const line = document.createElement("div");
    line.className = "term-line";
    const p = document.createElement("span");
    p.className = "terminal-prompt";
    p.textContent = promptText();
    line.append(p, " " + cmd);
    log.appendChild(line);
  }
  // A row of clickable names (used by ls).
  function printItems(items) {
    const line = document.createElement("div");
    line.className = "term-line term-items";
    items.forEach(({ label, isDir, cmd }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "term-item" + (isDir ? " term-dir" : "");
      b.textContent = label;
      b.addEventListener("click", () => run(cmd));
      line.appendChild(b);
    });
    log.appendChild(line);
  }

  // ---------------------------------------------------------
  // Commands
  // ---------------------------------------------------------
  function listDir(node, segs) {
    const names = Object.keys(node.children);
    if (!names.length) return;
    const base = tildePath(segs);
    printItems(
      names.map((name) => {
        const child = node.children[name];
        const path = base + "/" + name;
        let cmd;
        if (child.type === "dir") cmd = "cd " + path + " && ls";
        else cmd = (child.href ? "open " : "cat ") + path;
        return { label: name + (child.type === "dir" ? "/" : ""), isDir: child.type === "dir", cmd };
      })
    );
  }

  function treeLines(node, prefix, out) {
    const names = Object.keys(node.children);
    names.forEach((name, i) => {
      const last = i === names.length - 1;
      const child = node.children[name];
      out.push(prefix + (last ? "└── " : "├── ") + name + (child.type === "dir" ? "/" : ""));
      if (child.type === "dir") treeLines(child, prefix + (last ? "    " : "│   "), out);
    });
    return out;
  }

  const COMMANDS = {
    help() {
      [
        "available commands:",
        "  ls [dir]         list files",
        "  cd <dir>         change directory  (cd .. · cd ~ · cd -)",
        "  pwd              print working directory",
        "  cat <file>       print a file",
        "  open <path>      show it on the page (or open a .url link)",
        "  tree [dir]       show everything at once",
        "  clear            clear this terminal  (ctrl+L)",
        "  history          show previous commands",
        "",
        "tab completes names · ↑/↓ cycles history · click any name to open it",
      ].forEach((l) => print(l));
    },

    ls(args) {
      const targets = args.filter((a) => !a.startsWith("-"));
      if (!targets.length) targets.push(".");
      targets.forEach((t, i) => {
        const r = resolve(t);
        if (!r) return print("ls: " + t + ": No such file or directory", "term-err");
        if (r.node.type === "file") return print(r.segs[r.segs.length - 1]);
        if (targets.length > 1) print((i ? "\n" : "") + t + ":");
        listDir(r.node, r.segs);
      });
    },

    cd(args) {
      let target = args[0] || "~";
      if (target === "-") target = tildePath(prevCwd);
      let r = resolve(target);
      // Friendly shortcut: `cd codecrack` works from anywhere.
      if (!r && !target.includes("/")) r = projectBySlug(target);
      if (!r) return print("cd: no such file or directory: " + target, "term-err");
      if (r.node.type !== "dir") return print("cd: not a directory: " + target, "term-err");
      prevCwd = cwd;
      cwd = r.segs;
      updatePrompt();
      // Stepping into a project shows it above.
      if (cwd.length === 2 && cwd[0] === "projects") site.go("projects/" + cwd[1]);
    },

    pwd() {
      print(HOME_PATH + (cwd.length ? "/" + cwd.join("/") : ""));
    },

    cat(args) {
      if (!args.length) return print("usage: cat <file>  (try `ls`)", "term-err");
      args.forEach((t) => {
        const r = resolve(t);
        if (!r) {
          // `cat codecrack` → show that project's README.
          const p = !t.includes("/") && projectBySlug(t);
          if (p) return p.node.children["README.md"].lines.forEach((l) => print(l));
          return print("cat: " + t + ": No such file or directory", "term-err");
        }
        if (r.node.type === "dir") {
          if (r.node.children["README.md"]) return r.node.children["README.md"].lines.forEach((l) => print(l));
          return print("cat: " + t + ": Is a directory", "term-err");
        }
        r.node.lines.forEach((l) => print(l));
      });
    },

    open(args) {
      const t = args[0];
      const r = t ? resolve(t) || (!t.includes("/") && projectBySlug(t)) : resolve(".");
      if (!r) return print("open: " + t + ": No such file or directory  (try `ls`)", "term-err");
      const { node } = r;
      if (node.href) {
        window.open(node.href, "_blank", "noopener");
        return print("opening " + node.href.replace(/^https?:\/\//, "") + " ↗", "term-ok");
      }
      if (!node.el) return print("open: nothing to show for " + tildePath(r.segs), "term-err");
      print(node.summary || "→ " + tildePath(r.segs), "term-ok");
      site.reveal(node.el);
    },

    tree(args) {
      const r = resolve(args[0] || ".");
      if (!r || r.node.type !== "dir") return print("tree: " + (args[0] || ".") + ": not a directory", "term-err");
      print(r.segs.length ? r.segs[r.segs.length - 1] : "~");
      treeLines(r.node, "", []).forEach((l) => print(l));
    },

    clear() {
      log.innerHTML = "";
    },

    history() {
      history.forEach((h, i) => print(String(i + 1).padStart(4) + "  " + h));
    },

    echo(args) {
      print(args.join(" "));
    },
    whoami() {
      print("natalia — cs @ stanford, building intelligent systems.", "term-ok");
    },
    date() {
      print(new Date().toString());
    },
    sudo() {
      print("nice try 😄", "term-ok");
    },
    coffee() {
      print("☕ brewing...", "term-ok");
    },
    exit() {
      print("leaving so soon? `cat ~/contact.txt` to stay in touch 🙂", "term-hint");
    },
  };
  // Aliases
  Object.assign(COMMANDS, {
    dir: COMMANDS.ls,
    ll: COMMANDS.ls,
    cls: COMMANDS.clear,
    man: COMMANDS.help,
    "?": COMMANDS.help,
    less: COMMANDS.cat,
    more: COMMANDS.cat,
    head: COMMANDS.cat,
    logout: COMMANDS.exit,
  });

  function exec(cmd) {
    const [name, ...args] = cmd.split(/\s+/);
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(COMMANDS, key)) return COMMANDS[key](args);
    if (projectBySlug(name)) return COMMANDS.open([name]); // bare project name
    const r = resolve(name);
    if (r && r.node.type === "dir") return COMMANDS.cd([name]); // zsh auto_cd
    print("zsh: command not found: " + name + "  (try `help`)", "term-err");
  }

  const history = [];
  let histIndex = 0;

  function run(raw) {
    const line = raw.trim();
    printPrompt(line);
    if (line) {
      if (history[history.length - 1] !== line) history.push(line);
      histIndex = history.length;
      line.split(/\s*(?:&&|;)\s*/).filter(Boolean).forEach(exec);
    }
    log.scrollTop = log.scrollHeight;
  }

  // ---------------------------------------------------------
  // Tab completion
  // ---------------------------------------------------------
  function complete() {
    const v = input.value;
    const m = v.match(/^(.*?)(\S*)$/);
    const before = m[1];
    const token = m[2];
    const firstWord = !/\S/.test(before.split(/&&|;/).pop());
    let candidates;
    let dirPart = "";

    if (firstWord) {
      candidates = Object.keys(COMMANDS)
        .filter((c) => /^[a-z]/.test(c))
        .map((c) => ({ name: c, isDir: false }));
    } else {
      const slash = token.lastIndexOf("/");
      dirPart = token.slice(0, slash + 1);
      const r = resolve(dirPart || ".");
      if (!r || r.node.type !== "dir") return;
      candidates = Object.keys(r.node.children).map((name) => ({
        name,
        isDir: r.node.children[name].type === "dir",
      }));
    }
    const base = token.slice(dirPart.length).toLowerCase();
    const matches = candidates.filter((c) => c.name.toLowerCase().startsWith(base));
    if (!matches.length) return;

    if (matches.length === 1) {
      const c = matches[0];
      input.value = before + dirPart + c.name + (c.isDir ? "/" : " ");
      return;
    }
    // Extend to the longest common prefix, otherwise show the options.
    let prefix = matches[0].name;
    matches.forEach((c) => {
      while (!c.name.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1);
    });
    if (prefix.length > base.length) {
      input.value = before + dirPart + prefix;
    } else {
      printPrompt(v);
      print(matches.map((c) => c.name + (c.isDir ? "/" : "")).join("   "), "term-hint");
      log.scrollTop = log.scrollHeight;
    }
  }

  // ---------------------------------------------------------
  // Input wiring
  // ---------------------------------------------------------
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = input.value;
      input.value = "";
      run(v);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      histIndex = Math.max(0, histIndex - 1);
      input.value = history[histIndex];
    } else if (e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      histIndex = Math.min(history.length, histIndex + 1);
      input.value = history[histIndex] || "";
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      COMMANDS.clear();
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      printPrompt(input.value + "^C");
      input.value = "";
      log.scrollTop = log.scrollHeight;
    }
  });
  // Click anywhere on the terminal focuses the input (unless selecting text).
  term.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (window.getSelection && String(window.getSelection())) return;
    input.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------
  // Intro
  // ---------------------------------------------------------
  updatePrompt();
  printPrompt("ls");
  COMMANDS.ls([]);
  print("try `cd codecrack`, `cat README.md`, `tree ~`, or `help` ↵", "term-hint");
})();

document.getElementById("year").textContent = new Date().getFullYear();
