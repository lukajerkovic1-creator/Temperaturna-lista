// ============================================================
  // MODULE: 60-speech-ui-and-events.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
function getTherapySuggestionPanel(targetId) {
    const status = getSpeechStatusElement(targetId);
    if (!status) return null;
    let panel = document.getElementById(`${targetId}SpeechSuggestionPanel`);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = `${targetId}SpeechSuggestionPanel`;
    panel.className = 'therapy-speech-suggestion';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="therapy-speech-suggestion-title">Vođeni audio unos terapije</div>
      <div class="therapy-speech-live-steps" data-speech-live-steps></div>
      <div class="therapy-speech-live-current" data-speech-live-current></div>
      <div class="therapy-speech-suggestion-row"><strong>Prepoznato:</strong> <span class="therapy-speech-suggestion-source" data-speech-source></span></div>
      <div class="therapy-speech-suggestion-row"><strong>Sigurnost:</strong> <span class="therapy-speech-suggestion-confidence" data-speech-confidence></span></div>
      <div class="therapy-speech-suggestion-row"><strong>Validacija:</strong> <span class="therapy-speech-validation-status" data-speech-validation></span></div>
      <div class="therapy-speech-rule-hint">Vođeni audio unos ide redom: 1) lijek, 2) doza, 3) ritam doziranja, 4) put primjene. Segment koji ne odgovara aktivnom koraku ne upisuje se i aplikacija ostaje na istom koraku.</div>
      <textarea class="therapy-suggestion-edit" data-speech-suggestion-edit spellcheck="false" aria-label="Uredi prijedlog terapije prije prihvaćanja"></textarea>
      <div class="therapy-speech-suggestion-actions">
        <button type="button" data-speech-suggestion-action="accept">Prihvati prijedlog</button>
        <button type="button" class="secondary" data-speech-suggestion-action="original">Umetni izvorno</button>
        <button type="button" class="secondary" data-speech-suggestion-action="dismiss">Odbaci</button>
      </div>
    `;
    panel.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-speech-suggestion-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.speechSuggestionAction;
      handleTherapySuggestionAction(targetId, action);
    });
    panel.addEventListener('input', (event) => {
      if (event.target.closest('[data-speech-suggestion-edit]')) {
        updateTherapySuggestionPanelValidation(targetId);
      }
    });
    status.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function updateTherapySuggestionPanelValidation(targetId) {
    const panel = getTherapySuggestionPanel(targetId);
    const suggestion = state.speechInput.pendingSuggestions[targetId];
    if (!panel || !suggestion) return null;

    const editEl = panel.querySelector('[data-speech-suggestion-edit]');
    const validationEl = panel.querySelector('[data-speech-validation]');
    const acceptBtn = panel.querySelector('[data-speech-suggestion-action="accept"]');
    const originalBtn = panel.querySelector('[data-speech-suggestion-action="original"]');
    const currentText = editEl?.value || suggestion.suggestedText || '';
    const editValidation = validateTherapySpeechStructuredInput(currentText);
    const originalValidation = validateTherapySpeechStructuredInput(suggestion.rawText || '');

    suggestion.currentValidation = editValidation;
    suggestion.originalValidation = originalValidation;

    if (validationEl) {
      validationEl.textContent = editValidation.message;
      validationEl.classList.toggle('valid', editValidation.valid);
      validationEl.classList.toggle('invalid', !editValidation.valid);
    }
    panel.classList.toggle('invalid', !editValidation.valid);
    if (acceptBtn) {
      acceptBtn.disabled = !editValidation.valid;
      acceptBtn.title = editValidation.valid ? '' : 'Blokirano: prijedlog ne sadrži lijek, dozu, ritam doziranja i put primjene.';
    }
    if (originalBtn) {
      originalBtn.disabled = !originalValidation.valid;
      originalBtn.title = originalValidation.valid ? '' : 'Blokirano: izvorni audio tekst ne zadovoljava pravilo za unos terapije.';
    }
    return editValidation;
  }

  function showTherapySuggestion(targetId, suggestion) {
    const panel = getTherapySuggestionPanel(targetId);
    if (!panel || !suggestion) return;
    state.speechInput.pendingSuggestions[targetId] = suggestion;

    const sourceEl = panel.querySelector('[data-speech-source]');
    const confidenceEl = panel.querySelector('[data-speech-confidence]');
    const editEl = panel.querySelector('[data-speech-suggestion-edit]');

    if (sourceEl) sourceEl.textContent = suggestion.rawText || '—';
    if (confidenceEl) {
      confidenceEl.textContent = `${suggestion.confidence.label} — ${suggestion.confidence.message}`;
      confidenceEl.classList.remove('high', 'medium', 'low');
      confidenceEl.classList.add(suggestion.confidence.level);
    }
    if (editEl) editEl.value = suggestion.suggestedText || '';
    panel.classList.add('visible');
    updateTherapySuggestionPanelValidation(targetId);
  }

  function hideTherapySuggestion(targetId) {
    state.speechInput.pendingSuggestions[targetId] = null;
    if (state.speechInput.guidedSessions && Object.prototype.hasOwnProperty.call(state.speechInput.guidedSessions, targetId)) {
      state.speechInput.guidedSessions[targetId] = null;
    }
    const panel = document.getElementById(`${targetId}SpeechSuggestionPanel`);
    if (panel) panel.classList.remove('visible');
  }

  function handleTherapySuggestionAction(targetId, action) {
    const suggestion = state.speechInput.pendingSuggestions[targetId];
    const textarea = getSpeechTargetTextarea(targetId);
    const panel = getTherapySuggestionPanel(targetId);
    if (!textarea || !suggestion) return;

    if (action === 'dismiss') {
      hideTherapySuggestion(targetId);
      setSpeechStatus(targetId, 'Prijedlog je odbačen. Terapija nije promijenjena.', 'neutral');
      return;
    }

    const editEl = panel ? panel.querySelector('[data-speech-suggestion-edit]') : null;
    const textToInsert = action === 'original'
      ? (suggestion.rawText || '')
      : (editEl?.value || suggestion.suggestedText || suggestion.normalizedText || suggestion.rawText || '');
    const insertionValidation = validateTherapySpeechStructuredInput(textToInsert);
    if (!insertionValidation.valid) {
      if (panel) updateTherapySuggestionPanelValidation(targetId);
      setSpeechStatus(targetId, insertionValidation.message, 'warn');
      setStatus('Audio unos terapije je blokiran jer ne sadrži lijek, dozu, ritam doziranja i put primjene.', true);
      return;
    }

    const inserted = insertTextAtTextareaCursor(textarea, textToInsert);
    if (inserted) {
      hideTherapySuggestion(targetId);
      setSpeechStatus(targetId, action === 'original' ? 'Umetnut je izvorni prepoznati tekst.' : 'Prihvaćen je prijedlog terapije. Provjerite naziv, dozu, put i interval prije ispisa.', 'ok');
      setStatus('Glasovno unesena terapija je dodana nakon ručne potvrde. Obavezno provjeriti prije ispisa.');
    }
  }

  function stopSpeechInput() {
    state.speechInput.stopRequestedByUser = true;
    const recognition = state.speechInput.recognition;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        // Recognition can already be stopped; ignore browser-specific errors.
      }
    } else {
      finishSpeechInput('Audio unos je zaustavljen.', false);
    }
  }

  function finishSpeechInput(message, isError = false) {
    const targetId = state.speechInput.targetId;
    state.speechInput.isListening = false;
    state.speechInput.targetId = null;
    state.speechInput.recognition = null;
    state.speechInput.stopRequestedByUser = false;
    setSpeechButtonsState(null);
    if (targetId && message) {
      setSpeechStatus(targetId, message, isError ? 'warn' : 'ok');
    }
  }



  const THERAPY_SPEECH_GUIDED_STEPS = Object.freeze([
    {
      key: 'medication',
      label: 'Lijek',
      prompt: 'izgovorite generički ili tvornički naziv lijeka',
      example: 'npr. meropenem, Meronem, Tazocin, Lendacin'
    },
    {
      key: 'dose',
      label: 'Doza',
      prompt: 'izgovorite dozu s jedinicom',
      example: 'npr. 1 g, 500 mg, četiri i pol grama'
    },
    {
      key: 'schedule',
      label: 'Ritam',
      prompt: 'izgovorite ritam doziranja',
      example: 'npr. 1x1, 1,0,0 ili svakih 8 h'
    },
    {
      key: 'route',
      label: 'Put',
      prompt: 'izgovorite put primjene',
      example: 'npr. i.v., p.o., s.c. ili i.m.'
    }
  ]);

  function getTherapyGuidedStepLabel(stepKey) {
    return THERAPY_SPEECH_GUIDED_STEPS.find((step) => step.key === stepKey)?.label || stepKey;
  }

  function createTherapyGuidedSession(targetId) {
    return {
      targetId,
      stepIndex: 0,
      completed: false,
      values: {
        medication: '',
        dose: '',
        schedule: '',
        route: ''
      },
      rawSegments: [],
      medicationMatch: null,
      lastRejected: ''
    };
  }

  function getActiveTherapyGuidedSession(targetId) {
    return state.speechInput.guidedSessions?.[targetId] || null;
  }

  function getCurrentTherapyGuidedStep(session) {
    if (!session) return null;
    return THERAPY_SPEECH_GUIDED_STEPS[session.stepIndex] || null;
  }

  function formatGuidedTherapyLine(session) {
    if (!session) return '';
    return [session.values.medication, session.values.dose, session.values.schedule, session.values.route]
      .filter(Boolean)
      .join(' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function parseGuidedMedicationSegment(rawSegment) {
    const normalized = normalizeTherapySpeechTranscript(rawSegment);
    const exactResult = replaceExactMedicationVariants(normalized);
    let match = exactResult.bestMatch || null;
    if (!match) {
      const fuzzy = findFuzzyMedicationMatch(normalized);
      if (fuzzy && fuzzy.confidence >= 0.78) match = fuzzy;
    }
    if (!match) {
      return {
        valid: false,
        value: '',
        message: 'Nije prepoznat lijek iz rječnika. Ponovite samo naziv lijeka, npr. „Meronem”, „Tazocin”, „Lendacin”.'
      };
    }
    return {
      valid: true,
      value: match.canonical,
      match,
      message: `Prepoznat lijek: ${match.canonical}.`
    };
  }

  function parseGuidedDoseSegment(rawSegment) {
    const normalized = normalizeTherapySpeechTranscript(rawSegment);
    const doseMatch = normalized.match(/\b\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ml|l|L|ij|iu|jed\.?|mmol|%|amp(?:ula|ule)?|tbl\.?|tabl\.?|tableta|tablete|kaps\.?|kapsula|kapsule|kap|kapi|doza|doze|inhalacija|udaha)\b/i);
    if (!doseMatch) {
      return {
        valid: false,
        value: '',
        message: 'Nije prepoznata doza. Ponovite samo dozu s jedinicom, npr. „1 g”, „500 mg”, „4,5 g”.'
      };
    }
    let dose = doseMatch[0]
      .replace(/\s+/g, ' ')
      .replace(/\b(l)\b/i, 'L')
      .replace(/\bug\b/i, 'mcg')
      .trim();
    return { valid: true, value: dose, message: `Prepoznata doza: ${dose}.` };
  }

  function parseGuidedScheduleSegment(rawSegment) {
    const normalized = normalizeTherapySpeechTranscript(rawSegment);
    const schedulePatterns = [
      { pattern: /\bsvakih\s+(\d{1,2})\s*h\b/i, format: (match) => `svakih ${match[1]} h` },
      { pattern: /\b(\d{1,2})\s*h\b/i, format: (match) => `svakih ${match[1]} h` },
      { pattern: /\b(\d+)\s*x\s*(\d+)\b/i, format: (match) => `${match[1]}x${match[2]}` },
      { pattern: /\b(\d)\s*,\s*(\d)\s*,\s*(\d)(?:\s*,\s*(\d))?\b/i, format: (match) => match[4] ? `${match[1]},${match[2]},${match[3]},${match[4]}` : `${match[1]},${match[2]},${match[3]}` },
      { pattern: /\b(\d+)\s*x\s*dnevno\b/i, format: (match) => `${match[1]}x dnevno` },
      { pattern: /\bujutro\b/i, format: () => 'ujutro' },
      { pattern: /\bnavečer\b|\bnavecer\b/i, format: () => 'navečer' },
      { pattern: /\bna\s+dan\b/i, format: () => 'na dan' }
    ];
    for (const item of schedulePatterns) {
      const match = normalized.match(item.pattern);
      if (match) {
        const schedule = item.format(match);
        return { valid: true, value: schedule, message: `Prepoznat ritam doziranja: ${schedule}.` };
      }
    }
    return {
      valid: false,
      value: '',
      message: 'Nije prepoznat ritam doziranja. Ponovite samo ritam, npr. „1x1”, „1,0,0” ili „svakih 8 sati”.'
    };
  }

  function parseGuidedRouteSegment(rawSegment) {
    const normalized = normalizeTherapySpeechTranscript(rawSegment);
    const routePatterns = [
      { pattern: /(^|[^\p{L}\p{N}])(?:i\.v\.|iv)(?=$|[^\p{L}\p{N}])/iu, value: 'i.v.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:p\.o\.|po|per\s+os|na\s+usta|peroralno)(?=$|[^\p{L}\p{N}])/iu, value: 'p.o.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:s\.c\.|sc|subkutano)(?=$|[^\p{L}\p{N}])/iu, value: 's.c.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:i\.m\.|im|intramuskularno)(?=$|[^\p{L}\p{N}])/iu, value: 'i.m.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:p\.r\.|pr|rektalno|per\s+rectum)(?=$|[^\p{L}\p{N}])/iu, value: 'p.r.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:inh\.?|inhalacijski)(?=$|[^\p{L}\p{N}])/iu, value: 'inh.' },
      { pattern: /(^|[^\p{L}\p{N}])(?:lokalno)(?=$|[^\p{L}\p{N}])/iu, value: 'lokalno' }
    ];
    for (const item of routePatterns) {
      if (item.pattern.test(normalized)) {
        return { valid: true, value: item.value, message: `Prepoznat put primjene: ${item.value}.` };
      }
    }
    return {
      valid: false,
      value: '',
      message: 'Nije prepoznat put primjene. Ponovite samo put, npr. „i.v.”, „per os”, „subkutano”.'
    };
  }

  function parseGuidedTherapySegment(stepKey, rawSegment) {
    if (stepKey === 'medication') return parseGuidedMedicationSegment(rawSegment);
    if (stepKey === 'dose') return parseGuidedDoseSegment(rawSegment);
    if (stepKey === 'schedule') return parseGuidedScheduleSegment(rawSegment);
    if (stepKey === 'route') return parseGuidedRouteSegment(rawSegment);
    return { valid: false, value: '', message: 'Nepoznat korak unosa.' };
  }

  function syncGuidedTherapyDraftToSuggestion(targetId, session) {
    const panel = getTherapySuggestionPanel(targetId);
    if (!panel || !session) return;
    const draftText = formatGuidedTherapyLine(session);
    const rawText = session.rawSegments.join(' ').trim();
    state.speechInput.pendingSuggestions[targetId] = {
      rawText,
      normalizedText: draftText,
      suggestedText: draftText,
      match: session.medicationMatch,
      confidence: session.completed
        ? classifyTherapySuggestionConfidence(session.medicationMatch)
        : { level: 'medium', label: 'vođeni unos', message: 'U tijeku je unos po koracima.' },
      validation: validateTherapySpeechStructuredInput(draftText, session.medicationMatch)
    };

    const sourceEl = panel.querySelector('[data-speech-source]');
    const confidenceEl = panel.querySelector('[data-speech-confidence]');
    const editEl = panel.querySelector('[data-speech-suggestion-edit]');
    if (sourceEl) sourceEl.textContent = rawText || '—';
    if (confidenceEl) {
      const confidence = state.speechInput.pendingSuggestions[targetId].confidence;
      confidenceEl.textContent = `${confidence.label} — ${confidence.message}`;
      confidenceEl.classList.remove('high', 'medium', 'low');
      confidenceEl.classList.add(confidence.level === 'vođeni unos' ? 'medium' : confidence.level);
    }
    if (editEl) editEl.value = draftText;
    panel.classList.add('visible');
    updateTherapySuggestionPanelValidation(targetId);
  }

  function renderTherapyGuidedPanel(targetId, interimTranscript = '') {
    const session = getActiveTherapyGuidedSession(targetId);
    const panel = getTherapySuggestionPanel(targetId);
    if (!session || !panel) return;
    const currentStep = getCurrentTherapyGuidedStep(session);
    const stepsEl = panel.querySelector('[data-speech-live-steps]');
    const currentEl = panel.querySelector('[data-speech-live-current]');
    if (stepsEl) {
      stepsEl.innerHTML = THERAPY_SPEECH_GUIDED_STEPS.map((step, index) => {
        const value = session.values[step.key] || '';
        const cls = index < session.stepIndex || value ? 'done' : (index === session.stepIndex && !session.completed ? 'current' : 'pending');
        const shownValue = value ? escapeHtml(value) : '—';
        return `<div class="therapy-speech-live-step ${safeHtmlClassToken(cls, 'pending')}"><span>${index + 1}. ${escapeHtml(step.label)}</span><strong>${shownValue}</strong></div>`;
      }).join('');
    }
    if (currentEl) {
      if (session.completed) {
        currentEl.textContent = 'Svi koraci su prepoznati. Pregledajte terapiju i prihvatite prijedlog.';
      } else if (currentStep) {
        const interim = String(interimTranscript || '').trim();
        currentEl.textContent = `Sada: ${currentStep.prompt}. ${currentStep.example}.${interim ? ` Prepoznajem: ${interim}` : ''}`;
      } else {
        currentEl.textContent = '';
      }
      currentEl.classList.toggle('warn', Boolean(session.lastRejected));
    }
    syncGuidedTherapyDraftToSuggestion(targetId, session);
  }

  function buildCompletedGuidedTherapySuggestion(session) {
    const suggestedText = formatGuidedTherapyLine(session);
    const rawText = session.rawSegments.join(' ').trim();
    const confidence = classifyTherapySuggestionConfidence(session.medicationMatch);
    const validation = validateTherapySpeechStructuredInput(suggestedText, session.medicationMatch);
    return {
      rawText,
      normalizedText: suggestedText,
      suggestedText,
      match: session.medicationMatch,
      confidence,
      validation
    };
  }

  function handleGuidedTherapyFinalTranscript(targetId, transcript) {
    const session = getActiveTherapyGuidedSession(targetId);
    if (!session || session.completed) return;
    const currentStep = getCurrentTherapyGuidedStep(session);
    if (!currentStep) return;
    const rawSegment = String(transcript || '').trim();
    if (!rawSegment) return;

    const parsed = parseGuidedTherapySegment(currentStep.key, rawSegment);
    if (!parsed.valid) {
      session.lastRejected = rawSegment;
      renderTherapyGuidedPanel(targetId);
      setSpeechStatus(targetId, `${getTherapyGuidedStepLabel(currentStep.key)} nije prihvaćen: ${parsed.message}`, 'warn');
      setStatus('Audio segment nije prihvaćen jer ne odgovara aktivnom koraku unosa terapije.', true);
      return;
    }

    session.values[currentStep.key] = parsed.value;
    session.rawSegments.push(rawSegment);
    session.lastRejected = '';
    if (currentStep.key === 'medication') session.medicationMatch = parsed.match || null;
    session.stepIndex += 1;

    if (session.stepIndex >= THERAPY_SPEECH_GUIDED_STEPS.length) {
      session.completed = true;
      const suggestion = buildCompletedGuidedTherapySuggestion(session);
      state.speechInput.pendingSuggestions[targetId] = suggestion;
      showTherapySuggestion(targetId, suggestion);
      renderTherapyGuidedPanel(targetId);
      setSpeechStatus(targetId, 'Terapija je kompletno prepoznata. Pregledajte prijedlog i ručno ga prihvatite.', 'ok');
      setStatus('Vođeni audio unos terapije je dovršen. Prijedlog nije upisan dok ga ne prihvatite.');
      stopSpeechInput();
      return;
    }

    const nextStep = getCurrentTherapyGuidedStep(session);
    renderTherapyGuidedPanel(targetId);
    setSpeechStatus(targetId, `${parsed.message} Sada ${nextStep.prompt}.`, 'ok');
    setStatus(`Vođeni unos terapije: prihvaćen je korak ${currentStep.label}. Sljedeći korak: ${nextStep.label}.`);
  }
  function startSpeechInput(targetId) {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    const textarea = getSpeechTargetTextarea(targetId);
    if (!SpeechRecognition || !textarea) {
      setSpeechStatus(targetId, 'Diktiranje nije podržano u ovom pregledniku. Pokušajte Chrome ili Edge.', 'warn');
      setStatus('Diktiranje terapije nije podržano u ovom pregledniku.', true);
      return;
    }

    if (state.speechInput.isListening) {
      stopSpeechInput();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hr-HR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const existingSession = getActiveTherapyGuidedSession(targetId);
    const shouldResumeSession = Boolean(existingSession && !existingSession.completed);
    if (!shouldResumeSession) {
      hideTherapySuggestion(targetId);
      state.speechInput.guidedSessions[targetId] = createTherapyGuidedSession(targetId);
    }

    state.speechInput.recognition = recognition;
    state.speechInput.targetId = targetId;
    state.speechInput.isListening = true;
    state.speechInput.stopRequestedByUser = false;
    setSpeechButtonsState(targetId);
    renderTherapyGuidedPanel(targetId);

    const activeSession = getActiveTherapyGuidedSession(targetId);
    const currentStep = getCurrentTherapyGuidedStep(activeSession);
    const stepNumber = activeSession ? activeSession.stepIndex + 1 : 1;
    setSpeechStatus(targetId, `Korak ${stepNumber}/4: ${currentStep ? currentStep.prompt : 'izgovorite sljedeći podatak'}.`, 'ok');
    setStatus(shouldResumeSession
      ? 'Vođeni unos terapije nastavlja se od zadnjeg nedovršenog koraka.'
      : 'Vođeni audio unos terapije je pokrenut: lijek → doza → ritam doziranja → put primjene. Segment se prihvaća samo ako odgovara aktivnom koraku.');

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        handleGuidedTherapyFinalTranscript(targetId, finalTranscript);
      } else if (interimTranscript.trim()) {
        const session = getActiveTherapyGuidedSession(targetId);
        const currentStep = getCurrentTherapyGuidedStep(session);
        renderTherapyGuidedPanel(targetId, interimTranscript);
        setSpeechStatus(targetId, `${currentStep ? currentStep.label : 'Unos'} — prepoznajem: ${interimTranscript.trim()}`, 'neutral');
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event?.error || 'nepoznata greška';
      const messageMap = {
        'not-allowed': 'Mikrofon nije dopušten. Omogućite pristup mikrofonu u pregledniku.',
        'service-not-allowed': 'Preglednik ne dopušta uslugu prepoznavanja govora.',
        'no-speech': 'Nije prepoznat govor. Pokušajte ponovno bliže mikrofonu.',
        'audio-capture': 'Mikrofon nije pronađen ili nije dostupan.',
        'network': 'Prepoznavanje govora nije dostupno zbog mreže ili usluge preglednika.'
      };
      state.speechInput.stopRequestedByUser = false;
      finishSpeechInput(messageMap[errorCode] || `Diktiranje je prekinuto: ${errorCode}.`, true);
      setStatus('Diktiranje terapije je prekinuto.', true);
    };

    recognition.onend = () => {
      if (state.speechInput.isListening) {
        const session = getActiveTherapyGuidedSession(targetId);
        const stoppedByUser = state.speechInput.stopRequestedByUser;
        let message = '';
        let isError = false;
        if (session?.completed) {
          message = 'Vođeni unos je završen. Pregledajte terapiju prije prihvaćanja.';
        } else if (stoppedByUser) {
          message = 'Nedovršeni unos je pauziran i može se nastaviti ponovnim klikom.';
        } else {
          message = 'Diktiranje završeno. Nedovršeni audio unos nije moguće prihvatiti dok ne sadrži lijek, dozu, ritam i put primjene.';
          isError = true;
        }
        finishSpeechInput(message, isError);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      finishSpeechInput('Diktiranje nije moguće pokrenuti.', true);
      setStatus('Diktiranje terapije nije moguće pokrenuti.', true);
    }
  }

  function toggleSpeechInput(targetId) {
    if (state.speechInput.isListening) {
      if (state.speechInput.targetId === targetId) {
        stopSpeechInput();
      }
      return;
    }
    startSpeechInput(targetId);
  }

  function initSpeechInputControls() {
    const supported = Boolean(getSpeechRecognitionConstructor());
    ['therapy', 'ohbpTherapy'].forEach((targetId) => {
      const button = getSpeechButton(targetId);
      if (!button) return;
      button.addEventListener('click', () => toggleSpeechInput(targetId));
      if (!supported) {
        button.disabled = true;
        button.classList.remove('mic-off', 'mic-on', 'mic-paused');
        button.classList.add('mic-blocked');
        button.textContent = '🎙 Nije podržano';
        button.title = 'Diktiranje nije podržano u ovom pregledniku. Najčešće radi u Chromeu ili Edgeu.';
        setSpeechMicVisualState(targetId, 'blocked', 'Mikrofon nije podržan');
        setSpeechStatus(targetId, 'Diktiranje nije podržano u ovom pregledniku.', 'warn');
      } else {
        setSpeechButtonsState(null);
      }
    });
  }

  function onFormChanged() {
    updateDisplayToggleUi();
    renderAll();
    updatePatientSyncStateForCurrentForm();
    schedulePatientDraftSave();
    scheduleFirebasePatientAutoSave();
    updatePatientDraftControls(readPatientDraftFromStorage(), { preserveStatus: true });
    updateDowntimeBackupControls();
  }

  function handlePointerMove(event) {
    const drag = state.admin.drag;
    if (!drag) return;
    const field = getFieldRef(drag.layoutKey, drag.fieldPath);
    if (!field) return;
    const dx = Math.round((event.clientX - drag.startClientX) / drag.scaleX);
    const dy = Math.round((event.clientY - drag.startClientY) / drag.scaleY);

    if (drag.mode === 'move') {
      const origins = Array.isArray(drag.selectedDragOrigins) && drag.selectedDragOrigins.length
        ? drag.selectedDragOrigins
        : [{ layoutKey: drag.layoutKey, path: drag.fieldPath, originX: drag.originX, originY: drag.originY }];
      origins.forEach((origin) => {
        const targetField = getFieldRef(origin.layoutKey, origin.path);
        if (!targetField) return;
        targetField.x = Math.round(origin.originX + dx);
        targetField.y = Math.round(origin.originY + dy);
      });
    } else {
      let nextX = drag.originX;
      let nextY = drag.originY;
      let nextWidth = drag.originWidth;
      let nextHeight = drag.originHeight;
      const handle = drag.handle || 'se';

      if (handle.includes('e')) nextWidth = drag.originWidth + dx;
      if (handle.includes('s')) nextHeight = drag.originHeight + dy;
      if (handle.includes('w')) {
        nextX = drag.originX + dx;
        nextWidth = drag.originWidth - dx;
      }
      if (handle.includes('n')) {
        nextY = drag.originY + dy;
        nextHeight = drag.originHeight - dy;
      }

      const minSize = 12;
      if (nextWidth < minSize) {
        if (handle.includes('w')) nextX -= (minSize - nextWidth);
        nextWidth = minSize;
      }
      if (nextHeight < minSize) {
        if (handle.includes('n')) nextY -= (minSize - nextHeight);
        nextHeight = minSize;
      }

      field.x = Math.round(nextX);
      field.y = Math.round(nextY);
      field.width = Math.round(nextWidth);
      field.height = Math.round(nextHeight);
    }

    updateAdminInputs();
    saveCalibrationToStorage();
    renderAll();
  }

  function handlePointerUp() {
    if (!state.admin.drag) return;
    const beforeSnapshot = state.admin.drag.beforeSnapshot;
    state.admin.drag = null;
    pushUndoSnapshot(beforeSnapshot);
    saveCalibrationToStorage();
    updateAdminUnsavedIndicator();
  }

  function adjustSelectedField(dx, dy) {
    commitCalibrationMutation(() => {
      const items = getActiveEditableFields();
      items.forEach(({ field }) => {
        field.x += dx;
        field.y += dy;
      });
    });
  }

  function resizeSelectedField(dw, dh) {
    commitCalibrationMutation(() => {
      const items = getActiveEditableFields();
      items.forEach(({ field }) => {
        field.width = Math.max(12, field.width + dw);
        field.height = Math.max(12, field.height + dh);
      });
    });
  }

  function adjustSelectedFontSize(delta) {
    commitCalibrationMutation(() => {
      const items = getActiveEditableFields();
      items.forEach(({ field }) => {
        const current = Number(field.fontSize || 0);
        field.fontSize = Math.max(1, Math.round((current + delta) * 10) / 10);
        if (field.lineHeight && field.lineHeight < field.fontSize) {
          field.lineHeight = field.fontSize;
        }
      });
    });
  }

  function adjustSelectedLineHeight(delta) {
    commitCalibrationMutation(() => {
      const items = getActiveEditableFields();
      items.forEach(({ field }) => {
        const current = Number(field.lineHeight || field.fontSize || 0);
        field.lineHeight = Math.max(1, Math.round((current + delta) * 10) / 10);
      });
    });
  }

  function onKeyDown(event) {
    if (handleVisibleAdminDialogKeyDown(event)) return;

    const isAdminShortcut = (event.ctrlKey || event.metaKey) && event.altKey && event.code === 'KeyA';
    if (isAdminShortcut) {
      event.preventDefault();
      toggleAdminMode();
      return;
    }

    const isParserTestCaptureShortcut = (event.ctrlKey || event.metaKey) &&
      event.altKey &&
      (event.code === 'KeyP' || String(event.key || '').toLowerCase() === 'p');
    if (isParserTestCaptureShortcut) {
      event.preventDefault();
      event.stopPropagation();
      captureParserTestCaseFromShortcut();
      return;
    }

    if (!state.admin.enabled) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;

    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redoAdminChange();
      } else {
        undoAdminChange();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redoAdminChange();
      return;
    }

    const stepBase = Number(els.nudgeStep.value || 1);
    const step = event.shiftKey ? stepBase * 10 : stepBase;

    if ((event.ctrlKey || event.metaKey) && event.altKey) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        adjustSelectedLineHeight(-step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        adjustSelectedLineHeight(step);
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        adjustSelectedFontSize(-step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        adjustSelectedFontSize(step);
      }
      return;
    }

    if (event.altKey) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        resizeSelectedField(-step, 0);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        resizeSelectedField(step, 0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        resizeSelectedField(0, -step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        resizeSelectedField(0, step);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      adjustSelectedField(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      adjustSelectedField(step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      adjustSelectedField(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      adjustSelectedField(0, step);
    }
  }


  // v243: privremeno proširenje aktivnog tekstualnog okvira i Tab-navigacija samo kroz tekstualne okvire.
  const FOCUS_EXPANDING_TEXT_BOX_IDS = Object.freeze([
    'ohbpPasteBox',
    'fullName',
    'birthYear',
    'admissionDate',
    'diagnosis',
    'allergies',
    'patientOrigin',
    'therapy',
    'ohbpTherapy',
    'vitalSigns',
    'followUpControlDate',
    'followUpControl',
    'labRaw',
    'radiologyRaw'
  ]);

  const WORKFLOW_TAB_TARGET_SELECTORS = Object.freeze([
    '#ohbpPasteBox',
    '#fullName',
    '#birthYear',
    '#admissionDate',
    '#admissionDatePicker',
    '#diagnosis',
    '#allergies',
    '#patientOrigin',
    '#therapy',
    '#showTherapyMonday2',
    '[data-collapsible-edit-target="ohbpTherapy"]',
    '#ohbpTherapy',
    '[data-collapsible-edit-target="vitalSigns"]',
    '#vitalSigns',
    '[data-collapsible-edit-target="followUpControl"]',
    '#followUpControlDate',
    '#followUpControlDatePicker',
    '#followUpControl',
    '[data-collapsible-edit-target="microbiologySamples"]',
    '#microHemocultures',
    '#microUrineCulture',
    '#microStoolBacteriology',
    '#microStoolCdiff',
    '#microStoolVirology',
    '[data-collapsible-edit-target="labRaw"]',
    '#labRaw',
    '[data-collapsible-edit-target="radiologyRaw"]',
    '#radiologyRaw',
    '#printBtn'
  ]);

  const WORKFLOW_AUTO_EXPAND_TAB_TARGET_IDS = Object.freeze(new Set([
    'therapy'
  ]));

  function getFocusExpandingTextBoxes() {
    return FOCUS_EXPANDING_TEXT_BOX_IDS
      .map((id) => document.getElementById(id))
      .filter(isVisibleFocusableTextBox);
  }

  function isVisibleWorkflowFocusTarget(element) {
    if (!element || element.disabled) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    const closedDetails = element.closest('details:not([open])');
    if (closedDetails && !element.matches('summary') && !element.closest('summary')) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return canAutoExpandWorkflowTabTarget(element);
    return element.getClientRects().length > 0 || canAutoExpandWorkflowTabTarget(element);
  }

  function canAutoExpandWorkflowTabTarget(element) {
    const fieldId = String(element?.id || '');
    if (!WORKFLOW_AUTO_EXPAND_TAB_TARGET_IDS.has(fieldId)) return false;
    const section = element.closest(`[data-collapsible-field="${fieldId}"]`);
    return Boolean(section && section.classList.contains('is-collapsed'));
  }

  function expandWorkflowTabTargetIfNeeded(element) {
    if (!canAutoExpandWorkflowTabTarget(element)) return;
    setCollapsibleTextFieldExpanded(element.id, true);
  }

  function isVisibleFocusableTextBox(element) {
    if (!isVisibleWorkflowFocusTarget(element) || element.readOnly) return false;
    return true;
  }

  function getWorkflowTabTargets() {
    const seen = new Set();
    return WORKFLOW_TAB_TARGET_SELECTORS
      .map((selector) => document.querySelector(selector))
      .filter((element) => {
        if (!isVisibleWorkflowFocusTarget(element)) return false;
        if (seen.has(element)) return false;
        seen.add(element);
        return true;
      });
  }

  function applyWorkflowTabOrder() {
    WORKFLOW_TAB_TARGET_SELECTORS.forEach((selector, index) => {
      const element = document.querySelector(selector);
      if (element) element.tabIndex = isVisibleWorkflowFocusTarget(element) ? (index + 1) * 10 : -1;
    });
  }

  function getComfortScrollContainer(element) {
    let current = element?.parentElement || null;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const canScrollY = /(auto|scroll)/.test(style.overflowY);
      if (canScrollY && current.scrollHeight > current.clientHeight + 1) return current;
      current = current.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function getTextareaAutoResizeMaxHeight(element) {
    const computed = window.getComputedStyle(element);
    const cssMax = Number.parseFloat(computed.maxHeight);
    if (Number.isFinite(cssMax) && cssMax > 0) return cssMax;
    return ['ohbpPasteBox', 'labRaw', 'radiologyRaw'].includes(element?.id) ? 520 : 420;
  }

  function autoResizeTextarea(element) {
    if (!element || element.tagName !== 'TEXTAREA') return;
    if (!element.getClientRects().length) return;
    const computed = window.getComputedStyle(element);
    const minHeight = Number.parseFloat(computed.minHeight) || 72;
    const maxHeight = getTextareaAutoResizeMaxHeight(element);
    element.style.height = 'auto';
    const contentHeight = Math.ceil(element.scrollHeight + 2);
    const nextHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
  }

  function scheduleAutoResizeTextarea(element) {
    if (!element || element.tagName !== 'TEXTAREA') return;
    requestAnimationFrame(() => autoResizeTextarea(element));
  }

  function scheduleAutoResizeTextareas() {
    requestAnimationFrame(() => {
      document.querySelectorAll('.sidebar textarea').forEach(autoResizeTextarea);
    });
  }

  function wireAutoResizeTextareas() {
    document.querySelectorAll('.sidebar textarea').forEach((textarea) => {
      textarea.addEventListener('input', () => autoResizeTextarea(textarea));
      textarea.addEventListener('focus', () => scheduleAutoResizeTextarea(textarea));
    });
    window.addEventListener('resize', scheduleAutoResizeTextareas);
    scheduleAutoResizeTextareas();
  }

  function scrollFocusedTextBoxIntoComfortView(element) {
    if (!isVisibleWorkflowFocusTarget(element)) return;
    const container = getComfortScrollContainer(element);
    const isPage = container === document.documentElement || container === document.body || container === document.scrollingElement;
    const containerTop = isPage ? 0 : container.getBoundingClientRect().top;
    const containerHeight = isPage ? window.innerHeight : container.clientHeight;
    const currentScroll = isPage ? window.scrollY : container.scrollTop;
    const maxScroll = isPage
      ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      : Math.max(0, container.scrollHeight - container.clientHeight);
    const rect = element.getBoundingClientRect();
    const targetCenter = containerTop + (containerHeight * 0.46);
    const targetScroll = Math.max(0, Math.min(maxScroll, currentScroll + rect.top + (rect.height / 2) - targetCenter));

    if (Math.abs(targetScroll - currentScroll) < 8) return;
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (isPage) {
      window.scrollTo({ top: targetScroll, behavior });
    } else {
      container.scrollTo({ top: targetScroll, behavior });
    }
  }

  function scheduleFocusedTextBoxComfortScroll(element) {
    const run = () => scrollFocusedTextBoxIntoComfortView(element);
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    window.setTimeout(run, 220);
  }

  function clearAutoExpandedTextBoxes(exceptElement = null) {
    document.querySelectorAll('.focus-expand-textbox.is-auto-expanded-textbox').forEach((element) => {
      if (element !== exceptElement) {
        element.classList.remove('is-auto-expanded-textbox');
        scheduleAutoResizeTextarea(element);
      }
    });
  }

  function activateFocusedTextBox(element) {
    if (!isVisibleFocusableTextBox(element)) return;
    clearAutoExpandedTextBoxes(element);
    element.classList.add('is-auto-expanded-textbox');
    scheduleAutoResizeTextarea(element);
    scheduleFocusedTextBoxComfortScroll(element);
  }

  function activateWorkflowTabTarget(element) {
    if (element?.classList?.contains('focus-expand-textbox')) {
      activateFocusedTextBox(element);
      return;
    }
    clearAutoExpandedTextBoxes();
    scheduleFocusedTextBoxComfortScroll(element);
  }

  function getAdjacentWorkflowTabTarget(currentElement, direction) {
    const boxes = getWorkflowTabTargets();
    if (boxes.length < 2) return null;
    const currentId = String(currentElement?.id || '');
    const index = boxes.findIndex((box) => box === currentElement || (currentId && box.id === currentId));
    if (index < 0) return null;
    const nextIndex = (index + direction + boxes.length) % boxes.length;
    return boxes[nextIndex];
  }

  function focusWorkflowTabTarget(element) {
    if (!element) return false;
    expandWorkflowTabTargetIfNeeded(element);
    element.focus({ preventScroll: true });
    activateWorkflowTabTarget(element);
    if (typeof element.select === 'function' && element.tagName === 'INPUT') {
      try {
        element.select();
      } catch (error) {}
    }
    return true;
  }

  function focusAdjacentTextBox(currentElement, direction) {
    const next = getAdjacentWorkflowTabTarget(currentElement, direction);
    if (!next) return false;
    focusWorkflowTabTarget(next);
    return true;
  }

  function isTabNavigationKey(event) {
    return event.key === 'Tab' || event.code === 'Tab' || event.keyCode === 9;
  }

  function handleFocusExpandingTextBoxKeyDown(event) {
    if (!isTabNavigationKey(event) || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target?.closest?.('textarea,input,button,summary') || document.activeElement;
    const targets = getWorkflowTabTargets();
    const currentId = String(target?.id || '');
    const isWorkflowTarget = targets.some((item) => item === target || (currentId && item.id === currentId));
    if (!isWorkflowTarget) return;

    const next = getAdjacentWorkflowTabTarget(target, event.shiftKey ? -1 : 1);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    focusWorkflowTabTarget(next);
  }

  function initFocusExpandingTextBoxes() {
    applyWorkflowTabOrder();
    const boxes = FOCUS_EXPANDING_TEXT_BOX_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    boxes.forEach((element) => {
      element.classList.add('focus-expand-textbox');

      element.addEventListener('pointerdown', () => activateFocusedTextBox(element));
      element.addEventListener('focus', () => activateFocusedTextBox(element));
      element.addEventListener('keydown', handleFocusExpandingTextBoxKeyDown, true);

      element.addEventListener('blur', () => {
        element.classList.remove('is-auto-expanded-textbox');
        scheduleAutoResizeTextarea(element);
      });
    });
    document.addEventListener('keydown', handleFocusExpandingTextBoxKeyDown, true);
  }

  function wireEvents() {
    [els.fullName, els.birthYear, els.diagnosis, els.allergies, els.patientOrigin, els.therapy, els.ohbpTherapy, els.vitalSigns, els.followUpControlDate, els.followUpControl, els.microHemocultures, els.microUrineCulture, els.microStoolBacteriology, els.microStoolCdiff, els.microStoolVirology, els.labRaw, els.radiologyRaw, els.admissionDate, els.showTherapyMonday2, els.showDiagnosisOnList, els.showAllergiesOnList, els.showPatientOriginOnList, els.showTherapyOnList, els.showOhbpTherapyOnList, els.showVitalSignsOnList, els.showFollowUpControlOnList, els.showLabsOnList, els.showRadiologyOnList].filter(Boolean).forEach((element) => {
      const eventName = element.type === 'checkbox' ? 'change' : 'input';
      element.addEventListener(eventName, onFormChanged);
    });

    if (els.admissionDate) {
      els.admissionDate.addEventListener('input', updateAdmissionDateInputValidity);
      els.admissionDate.addEventListener('blur', normalizeAdmissionDateFieldForDisplay);
    }
    if (els.followUpControlDate) {
      els.followUpControlDate.addEventListener('blur', () => {
        const iso = normalizeAdmissionDateInput(els.followUpControlDate.value);
        if (iso) els.followUpControlDate.value = formatIsoDateToCroatian(iso);
        syncDatePickerFromText(els.followUpControlDate, els.followUpControlDatePicker);
      });
    }
    wireDatePicker(els.admissionDate, els.admissionDatePicker);
    wireDatePicker(els.followUpControlDate, els.followUpControlDatePicker);

    // Strip autofill signal when the user manually edits a parser-populated field
    [els.fullName, els.birthYear, els.admissionDate, els.diagnosis, els.allergies, els.patientOrigin, els.therapy, els.ohbpTherapy, els.vitalSigns, els.followUpControlDate, els.followUpControl, els.labRaw, els.radiologyRaw].filter(Boolean).forEach((el) => {
      el.addEventListener('input', () => markAutofilled(el, false));
    });
    if (els.radiologyRaw) {
      els.radiologyRaw.addEventListener('input', clearRadiologyShorteningHighlight);
    }

    wireTherapyValidationEvents();
    wireDiagnosisAutocomplete();
    wireTherapyAutocomplete();
    wireFollowUpControlLabPicker();
    wirePreviewPageControls();
    wireCollapsibleTextFields();
    wireAutoResizeTextareas();

    if (els.ohbpPasteBox) {
      els.ohbpPasteBox.addEventListener('paste', (event) => {
        const pastedText = event.clipboardData?.getData('text') || '';
        if (pastedText.trim()) {
          setTimeout(() => applyOhbpText(pastedText), 0);
        }
      });
      els.ohbpPasteBox.addEventListener('input', () => {
        const currentText = els.ohbpPasteBox.value;
        if (currentText.trim()) {
          applyOhbpText(currentText);
        }
      });
    }

    els.newBtn.addEventListener('click', startNewPatientEntry);
    els.saveDataBtn.addEventListener('click', savePatientData);
    els.loadDataBtn.addEventListener('click', () => els.loadDataInput.click());
    if (els.enableEncryptedPatientDraftBtn) els.enableEncryptedPatientDraftBtn.addEventListener('click', () => {
      void enableEncryptedPatientDraftRecovery();
    });
    if (els.restorePatientDraftBtn) els.restorePatientDraftBtn.addEventListener('click', () => {
      void restorePatientDraftFromStorage();
    });
    if (els.downloadPatientBackupBtn) els.downloadPatientBackupBtn.addEventListener('click', downloadPatientBackupData);
    if (els.downloadDowntimeBackupBtn) els.downloadDowntimeBackupBtn.addEventListener('click', downloadDowntimeBackupData);
    if (els.downloadFhirBundleBtn) els.downloadFhirBundleBtn.addEventListener('click', () => downloadFhirBundle());
    if (els.copyFhirBundleBtn) els.copyFhirBundleBtn.addEventListener('click', () => {
      void copyFhirBundleToClipboard();
    });
    if (els.loadDowntimeBackupBtn) els.loadDowntimeBackupBtn.addEventListener('click', () => {
      setDowntimeBackupStatus('Odaberi downtime backup JSON datoteku za ovlašteni restore.', 'warn');
      if (els.loadDataInput) {
        els.loadDataInput.click();
      } else {
        setStatus('Import datoteke nije dostupan u ovom pregledniku.', true);
      }
    });
    if (els.clearPatientDraftBtn) els.clearPatientDraftBtn.addEventListener('click', () => clearPatientDraft());
    if (els.patientModeOutpatientBtn) els.patientModeOutpatientBtn.addEventListener('click', () => changePatientMode(PATIENT_MODES.OUTPATIENT));
    if (els.patientModeWardBtn) els.patientModeWardBtn.addEventListener('click', () => changePatientMode(PATIENT_MODES.WARD));
    if (els.openFirebasePatientDialogBtn) els.openFirebasePatientDialogBtn.addEventListener('click', showFirebasePatientDialog);
    if (els.savePatientTopBtn) els.savePatientTopBtn.addEventListener('click', () => saveCurrentPatientToFirebase());
    if (els.newPatientEntryBtn) els.newPatientEntryBtn.addEventListener('click', startNewPatientEntry);
    if (els.firebasePatientSignInBtn) els.firebasePatientSignInBtn.addEventListener('click', signInFirebasePatients);
    if (els.firebasePatientSignOutBtn) els.firebasePatientSignOutBtn.addEventListener('click', signOutFirebasePatients);
    if (els.firebaseUserPanelToggleBtn) els.firebaseUserPanelToggleBtn.addEventListener('click', toggleFirebaseUserPanel);
    if (els.firebaseUserSwitchBtn) els.firebaseUserSwitchBtn.addEventListener('click', () => signInFirebasePatients({ fromGate: true }));
    if (els.firebaseUserNewBtn) els.firebaseUserNewBtn.addEventListener('click', showFirebaseNewUserProfileForm);
    if (els.firebaseUserSignOutBtn) els.firebaseUserSignOutBtn.addEventListener('click', signOutFirebasePatients);
    if (els.firebaseUserMigrateLegacyPatientsBtn) els.firebaseUserMigrateLegacyPatientsBtn.addEventListener('click', () => migrateLegacyFirebasePatientsToCurrentProfile());
    if (els.firebaseLoginGateSignInBtn) els.firebaseLoginGateSignInBtn.addEventListener('click', () => signInFirebasePatients({ fromGate: true }));
    if (els.firebaseLoginGateNewUserBtn) els.firebaseLoginGateNewUserBtn.addEventListener('click', () => {
      fillFirebaseRegistrationFormFromProfile(buildProfileSeedFromFirebaseUser(state.firebasePatients.user), { force: false });
      setFirebaseRegistrationMode(true);
      setFirebaseLoginGateStatus('Upiši ime, prezime, odjel i Gmail. Nakon toga se potvrđuje Google račun.');
    });
    if (els.firebaseRegisterBackBtn) els.firebaseRegisterBackBtn.addEventListener('click', () => {
      setFirebaseRegistrationMode(false);
      setFirebaseLoginGateStatus('Odaberi Google prijavu ili registraciju novog korisnika.');
    });
    if (els.firebaseRegistrationForm) els.firebaseRegistrationForm.addEventListener('submit', handleFirebaseRegistrationSubmit);
    if (els.firebaseLoginGateContinueOfflineBtn) els.firebaseLoginGateContinueOfflineBtn.addEventListener('click', () => {
      dismissFirebaseLoginGateForSession();
      setStatus('Aplikacija radi bez Firebase prijave. Firebase spremanje ostaje isključeno dok se ne prijavite.');
    });
    if (els.firebaseLoginGate) els.firebaseLoginGate.addEventListener('keydown', handleFirebaseLoginGateKeyDown, true);
    if (els.firebasePatientDialog) {
      els.firebasePatientDialog.addEventListener('keydown', handleFirebasePatientDialogKeyDown, true);
      els.firebasePatientDialog.addEventListener('click', (event) => {
        if (event.target === els.firebasePatientDialog) hideFirebasePatientDialog();
      });
    }
    if (els.firebasePatientDialogCloseBtn) els.firebasePatientDialogCloseBtn.addEventListener('click', () => hideFirebasePatientDialog());
    if (els.firebasePatientSearchInput) els.firebasePatientSearchInput.addEventListener('input', renderFirebasePatientDialogList);
    if (els.firebasePatientDialogOutpatientModeBtn) els.firebasePatientDialogOutpatientModeBtn.addEventListener('click', () => setFirebasePatientDialogMode(PATIENT_MODES.OUTPATIENT));
    if (els.firebasePatientDialogWardModeBtn) els.firebasePatientDialogWardModeBtn.addEventListener('click', () => setFirebasePatientDialogMode(PATIENT_MODES.WARD));
    if (els.firebasePatientShowArchivedToggle) els.firebasePatientShowArchivedToggle.addEventListener('change', () => {
      state.firebasePatients.showArchived = Boolean(els.firebasePatientShowArchivedToggle.checked && canManageArchivedFirebasePatients());
      renderFirebasePatientList(getFirebasePatientSelectedId());
    });
    if (els.firebasePatientDialogRefreshBtn) els.firebasePatientDialogRefreshBtn.addEventListener('click', () => refreshFirebasePatients());
    if (els.firebasePatientDialogSignInBtn) els.firebasePatientDialogSignInBtn.addEventListener('click', () => signInFirebasePatients());
    if (els.firebasePatientDialogList) {
      els.firebasePatientDialogList.addEventListener('click', (event) => {
        const actionButton = event.target?.closest?.('[data-firebase-patient-action]');
        if (actionButton) {
          event.preventDefault();
          event.stopPropagation();
          const recordId = actionButton.dataset.firebasePatientId || actionButton.closest('[data-firebase-patient-id]')?.dataset.firebasePatientId || '';
          const action = actionButton.dataset.firebasePatientAction || 'open';
          if (action === 'rename') {
            renameFirebasePatientById(recordId);
            return;
          }
          if (action === 'archive') {
            archiveFirebasePatientById(recordId);
            return;
          }
          if (action === 'restore') {
            restoreFirebasePatientById(recordId);
            return;
          }
          loadFirebasePatientById(recordId, { closeDialog: true });
          return;
        }
        const row = event.target?.closest?.('[data-firebase-patient-id]');
        if (!row) return;
        if (row.dataset.firebasePatientStatus === FIREBASE_PATIENT_STATUSES.DELETED) {
          setFirebasePatientDialogStatus('Arhivirani pacijent se prvo mora vratiti prije otvaranja.', true);
          return;
        }
        loadFirebasePatientById(row.dataset.firebasePatientId, { closeDialog: true });
      });
    }
    if (els.savePatientToFirebaseBtn) els.savePatientToFirebaseBtn.addEventListener('click', () => saveCurrentPatientToFirebase());
    if (els.refreshFirebasePatientsBtn) els.refreshFirebasePatientsBtn.addEventListener('click', () => refreshFirebasePatients());
    if (els.firebasePatientSelect) els.firebasePatientSelect.addEventListener('change', updateFirebasePatientControls);
    if (els.loadPatientFromFirebaseBtn) els.loadPatientFromFirebaseBtn.addEventListener('click', loadSelectedFirebasePatient);
    if (els.deletePatientFromFirebaseBtn) els.deletePatientFromFirebaseBtn.addEventListener('click', archiveSelectedFirebasePatient);
    window.addEventListener('beforeunload', (event) => {
      if (!shouldWarnAboutUnnamedPatient()) return;
      event.preventDefault();
      event.returnValue = MISSING_PATIENT_NAME_SAVE_MESSAGE;
      return MISSING_PATIENT_NAME_SAVE_MESSAGE;
    });
    initFirebasePatients();
    els.printBtn.addEventListener('click', printPages);
    if (els.adminToggleBtn) els.adminToggleBtn.addEventListener('click', toggleAdminMode);
    if (els.adminCloseBtn) els.adminCloseBtn.addEventListener('click', closeAdminMode);
    if (els.adminRefreshDashboardBtn) els.adminRefreshDashboardBtn.addEventListener('click', () => refreshAdminDashboard());
    if (els.adminExportReportBtn) els.adminExportReportBtn.addEventListener('click', exportAdminDashboardReport);
    [els.adminAddUserBtn, els.adminApproveUserBtn, els.adminEditUserRolesBtn, els.adminDeactivateUserBtn]
      .filter(Boolean)
      .forEach((button) => button.addEventListener('click', explainLockedAdminServerAction));
    if (els.saveCalibrationEmbeddedBtn) els.saveCalibrationEmbeddedBtn.addEventListener('click', saveCalibrationInsideHtmlApp);
    els.saveCalibrationBtn.addEventListener('click', () => { saveCalibrationToOnlineApp(); });
    els.loadCalibrationBtn.addEventListener('click', () => els.loadCalibrationInput.click());
    els.resetCalibrationBtn.addEventListener('click', resetCalibration);
    els.selectAllTextBoxesBtn.addEventListener('click', () => setSelectAllTextBoxes(!state.admin.selectAllTextBoxes));
    if (els.adminUndoBtn) els.adminUndoBtn.addEventListener('click', undoAdminChange);
    if (els.adminRedoBtn) els.adminRedoBtn.addEventListener('click', redoAdminChange);
    if (els.adminAdvancedToggleBtn) els.adminAdvancedToggleBtn.addEventListener('click', toggleAdminAdvancedControls);
    if (els.runBuiltInParserTestsBtn) els.runBuiltInParserTestsBtn.addEventListener('click', runBuiltInParserTests);
    if (els.runParserTestBtn) els.runParserTestBtn.addEventListener('click', runParserTest);
    if (els.clearParserTestBtn) els.clearParserTestBtn.addEventListener('click', clearParserTest);
    if (els.loadParserRegressionFileBtn && els.parserRegressionFileInput) els.loadParserRegressionFileBtn.addEventListener('click', () => els.parserRegressionFileInput.click());
    if (els.parserRegressionFileInput) els.parserRegressionFileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) loadParserRegressionCasesFromFile(file);
      event.target.value = '';
    });
    if (els.runParserRegressionBtn) els.runParserRegressionBtn.addEventListener('click', () => runParserRegressionTests());
    if (els.generateParserRegressionBtn) els.generateParserRegressionBtn.addEventListener('click', generateAndRunParserRegressionTests);
    if (els.loadCapturedParserTestsBtn) els.loadCapturedParserTestsBtn.addEventListener('click', loadCapturedParserTestsIntoRegression);
    if (els.downloadCapturedParserTestsBtn) els.downloadCapturedParserTestsBtn.addEventListener('click', downloadCapturedParserTestCases);
    if (els.downloadParserRegressionCasesBtn) els.downloadParserRegressionCasesBtn.addEventListener('click', downloadParserRegressionCases);
    if (els.downloadParserRegressionReportJsonBtn) els.downloadParserRegressionReportJsonBtn.addEventListener('click', downloadParserRegressionReportJson);
    if (els.downloadParserRegressionReportCsvBtn) els.downloadParserRegressionReportCsvBtn.addEventListener('click', downloadParserRegressionReportCsv);
    els.fontMinusBtn.addEventListener('click', () => adjustSelectedFontSize(-1));
    els.fontPlusBtn.addEventListener('click', () => adjustSelectedFontSize(1));
    els.lineMinusBtn.addEventListener('click', () => adjustSelectedLineHeight(-1));
    els.linePlusBtn.addEventListener('click', () => adjustSelectedLineHeight(1));

    els.loadDataInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) loadPatientDataFromFile(file);
      event.target.value = '';
    });

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    els.loadCalibrationInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) loadCalibrationFromFile(file);
      event.target.value = '';
    });

    els.adminLayoutSelect.addEventListener('change', () => {
      state.admin.selectedLayout = els.adminLayoutSelect.value;
      populateAdminFieldSelect();
      updateSelectAllTextBoxesButton();
      renderAdminOverlays();
    });

    els.adminFieldSelect.addEventListener('change', () => {
      ensureSingleSelection(state.admin.selectedLayout, els.adminFieldSelect.value);
      updateSelectAllTextBoxesButton();
      updateAdminInputs();
      renderAdminOverlays();
    });

    [els.fieldX, els.fieldY, els.fieldWidth, els.fieldHeight, els.fieldFontSize, els.fieldLineHeight, els.fieldAlign, els.fieldVisible].forEach((element) => {
      element.addEventListener('input', applyAdminInputValues);
      element.addEventListener('change', applyAdminInputValues);
    });

    [els.shell1, els.shell2].forEach((shell) => {
      shell.addEventListener('click', () => {
        if (!state.admin.enabled) return;
        state.admin.selectedLayout = shell.dataset.layout;
        state.admin.selectAllTextBoxes = false;
        ensureSingleSelection(state.admin.selectedLayout, state.admin.selectedField);
        populateAdminFieldSelect();
        updateSelectAllTextBoxesButton();
        renderAdminOverlays();
      });
    });

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', renderAdminOverlays);
    window.addEventListener('pageshow', () => {
      setDisplayTogglesDefaultOn();
      renderAll();
    });
  }

  function liftAdminPanelAboveApp() {
    if (els.adminPanel && els.adminPanel.parentElement !== document.body) {
      document.body.appendChild(els.adminPanel);
    }
  }

  async function init() {
    liftAdminPanelAboveApp();
    populateAdminLayoutSelect();
    populateAdminFieldSelect();
    forceAdminModeOffOnStartup();
    updateAdminAccessVisibility();
    setDisplayTogglesDefaultOn();
    applyPatientMode(DEFAULT_PATIENT_MODE, { renderLists: false });
    renderPatientSyncState();
    initAppAvailabilityMonitoring();
    updateDowntimeBackupControls();
    expandDefaultTextFields();
    wireEvents();
    exposeClinicalRecordHelpers();
    exposeParserTestCaptureHelpers();
    restorePatientDraftOnStartup();
    initFocusExpandingTextBoxes();
    initSpeechInputControls();

    // Prikaži listu odmah, čak i prije dovršetka učitavanja ugrađene podloge.
    renderAll();
    // v224: dodatni repaint nakon inicijalnog layouta u Chrome/Edge, da desni preview ne ostane prazan nakon učitavanja datoteke.
    window.setTimeout(() => renderAll(), 50);
    window.setTimeout(() => renderAll(), 250);

    const initialStatusText = String(els.statusBar?.textContent || '');
    try {
      await loadImages();
      renderAll();
      if (String(els.statusBar?.textContent || '') === initialStatusText) {
        setStatus('Aplikacija je spremna.');
      }
    } catch (error) {
      // Fallback: živi pregled ostaje vidljiv preko CSS podloge i bez pada aplikacije.
      renderAll();
      setAppAvailabilityState({
        appShellStatus: 'degraded',
        lastError: 'Podloge za pregled nisu učitane u canvas, ali osnovni unos i export i dalje rade.'
      });
      setStatus('Podloge za pregled nisu učitane u canvas, ali aplikacija i dalje radi.', true);
    }
  }

  init();
})();

