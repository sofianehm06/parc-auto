/* ===================================================================
   components.js — composants d'interface réutilisables
   (modale, toast, confirmation, constructeur de formulaire)
   Exposé via window.UI
   =================================================================== */
(function () {
  "use strict";
  const { qs, esc } = U;

  /* ---------- Toasts ----------------------------------------------- */
  function toast(message, type = "success") {
    const host = qs("#toast-host");
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 2600);
  }

  /* ---------- Modale ----------------------------------------------- */
  const overlay = () => qs("#modal-overlay");
  let onCloseCb = null;

  function openModal({ title, bodyEl, footerEl, wide = false, onClose = null }) {
    qs("#modal-title").textContent = title || "";
    const body = qs("#modal-body");
    const footer = qs("#modal-footer");
    body.innerHTML = "";
    footer.innerHTML = "";
    if (bodyEl) body.appendChild(bodyEl);
    if (footerEl) footer.appendChild(footerEl);
    qs(".modal").classList.toggle("modal-wide", !!wide);
    onCloseCb = onClose;
    overlay().hidden = false;
    document.body.style.overflow = "hidden";
    // focus premier champ
    const first = body.querySelector("input, select, textarea, button");
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeModal() {
    overlay().hidden = true;
    document.body.style.overflow = "";
    if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  }

  // fermeture : croix, clic en dehors, échap
  document.addEventListener("click", (e) => {
    if (e.target.id === "modal-close" || e.target === overlay()) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay().hidden) closeModal();
  });

  /* ---------- Confirmation ----------------------------------------- */
  function confirmDialog({ title = "Confirmer", message = "", confirmLabel = "Confirmer", danger = true }) {
    return new Promise((resolve) => {
      const body = document.createElement("div");
      body.innerHTML = `<p style="margin:0;color:var(--muted);font-size:14px;line-height:1.6">${esc(message)}</p>`;

      const footer = document.createElement("div");
      footer.style.display = "contents";
      const cancel = button("Annuler", "btn btn-ghost");
      const ok = button(confirmLabel, "btn " + (danger ? "btn-danger" : ""));
      cancel.onclick = () => { closeModal(); resolve(false); };
      ok.onclick = () => { closeModal(); resolve(true); };
      footer.append(cancel, ok);

      openModal({ title, bodyEl: body, footerEl: footer, onClose: () => resolve(false) });
    });
  }

  function button(label, cls) {
    const b = document.createElement("button");
    b.className = cls || "btn";
    b.type = "button";
    b.textContent = label;
    return b;
  }

  /* ---------- Constructeur de formulaire ---------------------------- *
   * fields: [{ name, label, type, options?, required?, placeholder?,
   *            hint?, min?, max?, step?, value?, colSpan? }]
   * type ∈ text | number | date | email | tel | select | textarea
   * --------------------------------------------------------------- */
  function buildForm(fields, values = {}) {
    const form = document.createElement("form");
    form.className = "form-grid";
    form.noValidate = true;

    const controls = {};

    fields.forEach((f) => {
      const wrap = document.createElement("div");
      wrap.className = "field" + (f.colSpan ? " col-span" : "");

      const id = "f-" + f.name;
      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.innerHTML = esc(f.label) + (f.required ? ' <span class="req">*</span>' : "");
      wrap.appendChild(label);

      let ctrl;
      const val = values[f.name] != null ? values[f.name] : (f.value != null ? f.value : "");

      if (f.type === "select") {
        ctrl = document.createElement("select");
        if (f.placeholder) {
          const o = document.createElement("option");
          o.value = ""; o.textContent = f.placeholder;
          ctrl.appendChild(o);
        }
        (f.options || []).forEach((opt) => {
          const o = document.createElement("option");
          if (typeof opt === "string") { o.value = opt; o.textContent = opt; }
          else { o.value = opt.value; o.textContent = opt.label; }
          if (String(o.value) === String(val)) o.selected = true;
          ctrl.appendChild(o);
        });
      } else if (f.type === "textarea") {
        ctrl = document.createElement("textarea");
        ctrl.value = val;
        if (f.placeholder) ctrl.placeholder = f.placeholder;
      } else {
        ctrl = document.createElement("input");
        ctrl.type = f.type || "text";
        ctrl.value = val;
        if (f.placeholder) ctrl.placeholder = f.placeholder;
        if (f.min != null) ctrl.min = f.min;
        if (f.max != null) ctrl.max = f.max;
        if (f.step != null) ctrl.step = f.step;
      }
      ctrl.id = id;
      ctrl.name = f.name;
      if (f.required) ctrl.required = true;
      wrap.appendChild(ctrl);

      if (f.hint) {
        const h = document.createElement("div");
        h.className = "hint"; h.textContent = f.hint;
        wrap.appendChild(h);
      }
      const err = document.createElement("div");
      err.className = "err"; err.textContent = "Champ requis";
      wrap.appendChild(err);

      controls[f.name] = { ctrl, wrap, field: f };
      form.appendChild(wrap);
    });

    function getValues() {
      const out = {};
      fields.forEach((f) => {
        let v = controls[f.name].ctrl.value;
        if (f.type === "number") v = v === "" ? null : Number(v);
        else if (typeof v === "string") v = v.trim();
        out[f.name] = v;
      });
      return out;
    }

    function validate() {
      let ok = true;
      fields.forEach((f) => {
        const { ctrl, wrap } = controls[f.name];
        const v = ctrl.value.trim ? ctrl.value.trim() : ctrl.value;
        const bad = f.required && !v;
        wrap.classList.toggle("invalid", !!bad);
        if (bad && ok) { ctrl.focus(); ok = false; }
      });
      return ok;
    }

    return { form, getValues, validate, controls };
  }

  /* ---------- Modale de formulaire (raccourci) ---------------------- */
  function formModal({ title, fields, values, submitLabel = "Enregistrer", wide = false, onSubmit }) {
    const { form, getValues, validate } = buildForm(fields, values);

    const footer = document.createElement("div");
    footer.style.display = "contents";
    const cancel = button("Annuler", "btn btn-ghost");
    const submit = button(submitLabel, "btn");
    cancel.onclick = closeModal;
    const doSubmit = () => {
      if (!validate()) { toast("Veuillez remplir les champs obligatoires.", "error"); return; }
      const res = onSubmit(getValues());
      if (res !== false) closeModal();
    };
    submit.onclick = doSubmit;
    form.addEventListener("submit", (e) => { e.preventDefault(); doSubmit(); });
    footer.append(cancel, submit);

    openModal({ title, bodyEl: form, footerEl: footer, wide });
  }

  window.UI = { toast, openModal, closeModal, confirmDialog, buildForm, formModal, button };
})();
