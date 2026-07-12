/* ============================================================
   LUMIÈRE — interactions
   ============================================================ */
(function () {
  'use strict';

  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');
  const progress = document.getElementById('scrollProgress');
  const heroStage = document.getElementById('heroStage');
  const isHome = !!heroStage;

  // Tag the home page so the nav logo stays hidden until the brand docks
  if (isHome) document.body.classList.add('home');

  /* ---- Scroll handling: progress bar + nav state + brand reveal ---- */
  function onScroll() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';

    if (!nav.classList.contains('is-solid')) {
      nav.classList.toggle('is-scrolled', y > 40);
    }

    // Brand-reveal: map first viewport-height of scroll to progress 0 → 1
    if (isHome) {
      const p = Math.min(1, y / (window.innerHeight * 0.7));
      heroStage.style.setProperty('--p', p.toFixed(3));
      // As the big brand flies into the corner, hand off to the docked nav logo.
      // Dock while the hero brand is still fading so the two cross-fade (no dead zone).
      nav.classList.toggle('brand-docked', p > 0.5);
      if (p > 0.05) nav.classList.add('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      const open = navLinks.classList.toggle('is-open');
      nav.classList.toggle('is-open', open);
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('is-open');
        nav.classList.remove('is-open');
      }
    });
  }

  /* ---- Reveal on scroll ---- */
  const revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Menu filtering (menu page) ---- */
  const chips = document.querySelectorAll('.chip');
  const rows = document.querySelectorAll('.mrow');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      const filter = chip.dataset.filter;
      rows.forEach(function (row) {
        const show = filter === 'all' || row.dataset.cat === filter;
        row.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ---- Reservation form (home page) ---- */
  const form = document.getElementById('reserveForm');
  if (form) {
    const note = document.getElementById('formNote');
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Honeypot: real visitors never fill this. If it's non-empty, silently
      // stop here — no error shown, so a bot can't tell it was caught.
      const trap = form.querySelector('.hp-field');
      if (trap && trap.value) return;

      // Read + defensively cap length (belt-and-braces with maxlength attrs)
      const name = document.getElementById('name').value.trim().slice(0, 80);
      const email = document.getElementById('email').value.trim().slice(0, 120);
      const date = dateInput.value;
      const guests = document.getElementById('guests').value;

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const guestsOk = ['2', '3', '4', '5', '6'].indexOf(guests) !== -1;

      // Validate the date is real, not in the past, and within the 30-day window
      let dateOk = false, chosen = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        chosen = new Date(date + 'T00:00:00');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const max = new Date(today); max.setDate(max.getDate() + 30);
        dateOk = !isNaN(chosen) && chosen >= today && chosen <= max;
      }

      note.className = 'reserve__note';
      if (!name || !email || !date) {
        note.textContent = 'Please complete every field to continue.';
        note.classList.add('is-err'); return;
      }
      if (!emailOk) {
        note.textContent = 'That email address doesn’t look right.';
        note.classList.add('is-err'); return;
      }
      if (!dateOk) {
        note.textContent = 'Please choose a date within the next 30 days.';
        note.classList.add('is-err'); return;
      }
      if (!guestsOk) {
        note.textContent = 'Please choose a valid party size.';
        note.classList.add('is-err'); return;
      }

      // textContent (not innerHTML) is used throughout, so user input can never
      // inject markup — safe against XSS by construction.
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });

        if (res.ok) {
          const firstName = name.split(/\s+/)[0];
          const pretty = chosen.toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric'
          });
          note.textContent = 'Thank you, ' + firstName + '. We’ve received your request for ' +
            guests + ' on ' + pretty + '. We’ll confirm by email shortly.';
          note.classList.add('is-ok');
          form.reset();
        } else {
          note.textContent = 'Something went wrong sending your request — please call us instead.';
          note.classList.add('is-err');
        }
      } catch (err) {
        note.textContent = 'Couldn’t reach the server — please check your connection or call us.';
        note.classList.add('is-err');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* ---- Newsletter form (blog page) ---- */
  const newsForm = document.getElementById('newsletterForm');
  if (newsForm) {
    const newsNote = document.getElementById('newsNote');
    newsForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const trap = newsForm.querySelector('.hp-field');
      if (trap && trap.value) return;

      const email = document.getElementById('newsEmail').value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      newsNote.className = 'reserve__note';
      if (!ok) {
        newsNote.textContent = 'Please enter a valid email.';
        newsNote.classList.add('is-err'); return;
      }

      const btn = newsForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch(newsForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(newsForm)
        });
        newsNote.textContent = res.ok
          ? 'You’re on the list — welcome to the table.'
          : 'Something went wrong — please try again.';
        newsNote.classList.add(res.ok ? 'is-ok' : 'is-err');
        if (res.ok) newsForm.reset();
      } catch (err) {
        newsNote.textContent = 'Couldn’t reach the server — please try again later.';
        newsNote.classList.add('is-err');
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
