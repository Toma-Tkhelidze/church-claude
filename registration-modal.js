/**
 * ღონისძიებაზე რეგისტრაციის ფორმა.
 *
 * ერთი ასლი ორივე გვერდისთვის — რეგისტრაციის გვერდისა და მთავარი
 * გვერდისთვის. Google Form-ის ველების იდენტიფიკატორები მხოლოდ აქ წერია:
 * ორ ადგილას რომ გვქონოდა, ერთის შეცვლისას მეორე ჩუმად გაფუჭდებოდა.
 *
 * გამოყენება:  openRegistrationModal('youth-camp', 'ახალგაზრდული ბანაკი')
 */

// ── ღონისძიებების კონფიგურაცია ────────────────────────────────────
// fields — რომელი ველები გამოჩნდეს; action/entries — სად და რა სახელით
// გაიგზავნოს. entries-ის გასაღებები ველების სახელებს ემთხვევა.
const REG_EVENTS = {
  'youth-camp': {
    fields: ['name', 'phone', 'email', 'health'],
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSdOF7yR7VAkNE8WfHtCEAZYo1CJ7ZfEv5Q6cnlmT5slwbOgtQ/formResponse',
    fixed: { 'entry.1880814093': 'ბანაკის რეგისტრაცია' },
    entries: {
      name: 'entry.557391057',
      phone: 'entry.1784465689',
      email: 'entry.724360013',
      health: 'entry.167549696'
    }
  },
  'kids-camp': {
    fields: ['name', 'phone', 'age', 'health'],
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSdNgq0LK-c18wK8fQP7FGiwwodwMwVXwt8sUd1OlgjZy9AUTw/formResponse',
    entries: {
      name: 'entry.251486321',
      phone: 'entry.655341646',
      age: 'entry.1315787688',
      health: 'entry.534558569'
    }
  },
  'conference': {
    fields: ['name', 'phone', 'email'],
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSc0BmGddd6TqhlOyJ8YgdhibEyyDRXZ-9lxSaklIaxRQXk6Kw/formResponse',
    entries: {
      name: 'entry.1433987399',
      phone: 'entry.1084503275',
      email: 'entry.722957650'
    }
  }
};

// ── ველების აღწერა ────────────────────────────────────────────────
const REG_FIELDS = {
  name: {
    label: 'სახელი და გვარი *', type: 'text', placeholder: 'მაგ: გიორგი კაპანაძე',
    error: 'გთხოვთ შეიყვანოთ სწორი სახელი და გვარი (მხოლოდ ტექსტი, ციფრების გარეშე)!',
    validate: v => v.trim().length >= 3 && /^[a-zA-Zა-ჰ\s]+$/.test(v.trim())
  },
  phone: {
    label: 'ტელეფონის ნომერი *', type: 'tel', placeholder: 'მაგ: 599XXXYYY',
    error: 'ნომერი უნდა შეიცავდეს მხოლოდ 9 ციფრს და იწყებოდეს 5-იანით!',
    validate: v => /^5\d{8}$/.test(v.trim())
  },
  email: {
    label: 'ელ-ფოსტა *', type: 'email', placeholder: 'მაგ: example@gmail.com',
    error: 'გთხოვთ შეიყვანოთ სწორი ელ-ფოსტის მისამართი!',
    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  },
  age: {
    label: 'ბავშვის ასაკი *', type: 'text', placeholder: 'მაგ: 8',
    error: 'ასაკი უნდა შედგებოდეს მაქსიმუმ ორი ციფრისგან, ტექსტის გარეშე!',
    validate: v => /^\d{1,2}$/.test(v.trim()) && parseInt(v.trim(), 10) !== 0
  },
  health: {
    label: 'განსაკუთრებული საჭიროებები (ალერგია ან კვებითი შეზღუდვა)',
    type: 'textarea', placeholder: 'ასეთის არსებობის შემთხვევაში აღწერეთ...',
    validate: () => true
  }
};

let regModalEl = null;
let regCurrentEvent = '';

function regEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** მოდალი ერთხელ ჩნდება გვერდზე და შემდეგ მრავალჯერ გამოიყენება. */
function ensureRegistrationModal() {
  if (regModalEl) return regModalEl;

  let box = document.getElementById('registrationModal');
  if (!box) {
    box = document.createElement('div');
    box.className = 'reg-modal';
    box.id = 'registrationModal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<div class="modal-content-box">' +
        '<button class="modal-close-btn" id="closeModalBtn" aria-label="დახურვა"><i class="fa-solid fa-xmark"></i></button>' +
        '<h2 id="modalTitle">რეგისტრაცია</h2>' +
        '<form id="dynamicRegisterForm" novalidate>' +
          '<div id="formFieldsContainer"></div>' +
          '<div class="form-submit-row" style="margin-top: 25px;">' +
            '<button type="submit" class="btn-modal-primary">განაცხადის გაგზავნა</button>' +
          '</div>' +
        '</form>' +
        '<div class="success-toast" id="successToast">' +
          '<i class="fa-solid fa-circle-check"></i>' +
          '<h4>რეგისტრაცია წარმატებით შესრულდა!</h4>' +
          '<p>თქვენი მონაცემები მიღებულია ბაზაში, მალე დაგიკავშირდებით.</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
  }

  regModalEl = box;

  const close = () => closeRegistrationModal();
  const closeBtn = box.querySelector('#closeModalBtn');
  if (closeBtn) closeBtn.addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && box.classList.contains('modal-active')) close();
  });

  const form = box.querySelector('#dynamicRegisterForm');
  if (form) form.addEventListener('submit', handleRegistrationSubmit);

  return box;
}

function buildRegistrationFields(eventId) {
  const config = REG_EVENTS[eventId];
  const container = regModalEl.querySelector('#formFieldsContainer');
  if (!config || !container) return;

  container.innerHTML = config.fields.map(key => {
    const f = REG_FIELDS[key];
    if (!f) return '';
    const control = f.type === 'textarea'
      ? '<textarea id="reg_' + key + '" rows="3" placeholder="' + regEscape(f.placeholder) + '"></textarea>'
      : '<input type="' + f.type + '" id="reg_' + key + '" placeholder="' + regEscape(f.placeholder) + '">';
    const error = f.error
      ? '<div class="error-message" id="err_' + key + '">' + regEscape(f.error) + '</div>'
      : '';
    return '<div class="form-group"><label>' + regEscape(f.label) + '</label>' + control + error + '</div>';
  }).join('');
}

function handleRegistrationSubmit(e) {
  e.preventDefault();
  const config = REG_EVENTS[regCurrentEvent];
  if (!config) return;

  regModalEl.querySelectorAll('.form-group').forEach(el => el.classList.remove('has-error'));
  regModalEl.querySelectorAll('.error-message').forEach(el => { el.style.display = 'none'; });

  const values = {};
  let valid = true;
  config.fields.forEach(key => {
    const input = regModalEl.querySelector('#reg_' + key);
    if (!input) return;
    values[key] = input.value;
    if (!REG_FIELDS[key].validate(input.value)) {
      input.parentElement.classList.add('has-error');
      const err = regModalEl.querySelector('#err_' + key);
      if (err) err.style.display = 'flex';
      valid = false;
    }
  });
  if (!valid) return;

  const formData = new FormData();
  Object.keys(config.fixed || {}).forEach(k => formData.append(k, config.fixed[k]));
  config.fields.forEach(key => {
    const entry = config.entries[key];
    if (entry) formData.append(entry, (values[key] || '').trim());
  });

  const form = regModalEl.querySelector('#dynamicRegisterForm');
  const toast = regModalEl.querySelector('#successToast');
  const submitBtn = form.querySelector('.btn-modal-primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'იგზავნება…'; }

  // Google Forms CORS-ს არ უშვებს — no-cors რეჟიმში პასუხს ვერ ვკითხულობთ,
  // მაგრამ ჩანაწერი მაინც ჩადის.
  fetch(config.action, { method: 'POST', body: formData, mode: 'no-cors' })
    .then(() => {
      form.style.display = 'none';
      if (toast) toast.style.display = 'block';
      setTimeout(closeRegistrationModal, 2500);
    })
    .catch(err => {
      console.error('რეგისტრაციის გაგზავნა ვერ მოხერხდა:', err);
      alert('ხარვეზი მონაცემთა გადაცემისას.');
    })
    .finally(() => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'განაცხადის გაგზავნა'; }
    });
}

function closeRegistrationModal() {
  if (!regModalEl) return;
  regModalEl.classList.remove('modal-active');
  if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
}

/** ფორმის გახსნა. eventId უნდა იყოს REG_EVENTS-ის გასაღები. */
function openRegistrationModal(eventId, title) {
  if (!REG_EVENTS[eventId]) {
    console.warn('რეგისტრაციის ფორმა ამ ღონისძიებისთვის აღწერილი არ არის:', eventId);
    return false;
  }
  ensureRegistrationModal();
  regCurrentEvent = eventId;

  const heading = regModalEl.querySelector('#modalTitle');
  if (heading) heading.textContent = (title ? title + ' - ' : '') + 'რეგისტრაცია';

  buildRegistrationFields(eventId);

  const form = regModalEl.querySelector('#dynamicRegisterForm');
  const toast = regModalEl.querySelector('#successToast');
  if (form) form.style.display = 'block';
  if (toast) toast.style.display = 'none';

  regModalEl.classList.add('modal-active');
  if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
  return true;
}
