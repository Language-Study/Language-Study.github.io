// AI Practice Tips helper (client-side)
// Tries a backend endpoint first; falls back to local heuristics.
// Optional: set window.AI_TIPS_ENDPOINT to your deployed Cloud Function HTTPS URL.

(function () {
    const DEFAULT_TIMEOUT_MS = 8000;

    function getSelectedStudyLanguage() {
        try {
            const el = document.getElementById('languageSelect');
            const val = (el && el.value) ? String(el.value).trim() : '';
            return val || null;
        } catch (_) {
            return null;
        }
    }

    function uniqueList(items) {
        return Array.from(new Set(items.filter(Boolean).map(s => s.trim())));
    }

    function buildHeuristicTips(skill) {
        const tips = [];
        const name = (skill?.name || '').trim();
        const subtasks = Array.isArray(skill?.subtasks) ? skill.subtasks : [];
        const status = skill?.status || '';
        const lang = getSelectedStudyLanguage();

        const langNote = lang ? ` for ${lang}` : '';

        if (status === 'not_started') {
            tips.push(
                `Break "${name}" into 2-3 small actions and schedule the first one today`,
                `Find a short video/example${langNote} that demonstrates "${name}"`,
                `Create a simple checklist to track attempts of "${name}" this week`
            );
        } else if (status === 'in_progress') {
            tips.push(
                `Practice "${name}" in a 10-minute focused session (timer on)`,
                `Record yourself doing "${name}", then watch once to note 1 improvement`,
                `Alternate input/output: watch/read one example, then produce one attempt`
            );
        } else if (status === 'mastered') {
            tips.push(
                `Teach "${name}" briefly to a peer or in your notes`,
                `Do a quick refresh: 2 fast reps to keep it sharp`,
                `Combine "${name}" with another skill for a mini-challenge`
            );
        } else {
            tips.push(
                `Define what success for "${name}" looks like in one sentence`,
                `Do one tiny first step that takes under 5 minutes`,
                `Find one real-world example and mirror it once`
            );
        }

        const subtaskTexts = uniqueList(subtasks.map(st => st?.text || ''));
        if (subtaskTexts.length) {
            tips.push(`Pick one subtask to finish next: "${subtaskTexts[0]}"`);
        }

        return uniqueList(tips).slice(0, 5);
    }

    async function callBackendForTips(skill, signal) {
        const endpoint = window.AI_TIPS_ENDPOINT;
        const apiKey = window.GROQ_API_KEY || window.GEMINI_API_KEY;

        // If no endpoint but have API key, call Groq or Gemini directly
        if (!endpoint && apiKey) {
            return window.GROQ_API_KEY ?
                await callGroqDirect(skill, apiKey, signal) :
                await callGeminiDirect(skill, apiKey, signal);
        }

        if (!endpoint) return null;

        const payload = {
            skillName: skill?.name || '',
            status: skill?.status || '',
            subtasks: (skill?.subtasks || []).map(st => st?.text || '').filter(Boolean),
            language: getSelectedStudyLanguage(),
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal,
        });

        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        if (!data || !Array.isArray(data.tips) || data.tips.length === 0) return null;
        return data.tips.map(t => String(t));
    }

    async function callGroqDirect(skill, apiKey, signal) {
        const skillName = skill?.name || '';
        const status = skill?.status || '';
        const subtasks = (skill?.subtasks || []).map(st => st?.text || '').filter(Boolean);
        const language = getSelectedStudyLanguage();

        const systemPrompt = 'You are a concise language-learning coach. Suggest 3-5 specific, actionable practice tips. Each tip should be short (<= 1 sentence) and concrete. Respond as JSON: { "tips": ["...", "...", ...] }';

        const userPrompt = [
            `Skill: ${skillName}`,
            `Status: ${status}`,
            `Language: ${language || 'unspecified'}`,
            `Subtasks: ${subtasks.join('; ') || 'none'}`
        ].join('\n');

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: res.statusText }));
            console.error('Groq API error:', errorData);
            return null;
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || '';

        let tips = [];
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed.tips)) tips = parsed.tips.map(String);
            }
        } catch (_) { /* fallback */ }

        if (!tips.length) {
            tips = text
                .split(/\n|\r/)
                .map(s => s.replace(/^[-*•]\s*/, '').trim())
                .filter(Boolean)
                .slice(0, 5);
        }

        return tips.length ? tips : null;
    }

    async function callGeminiDirect(skill, apiKey, signal) {
        const skillName = skill?.name || '';
        const status = skill?.status || '';
        const subtasks = (skill?.subtasks || []).map(st => st?.text || '').filter(Boolean);
        const language = getSelectedStudyLanguage();

        const prompt = [
            'You are a concise language-learning coach.',
            'Given a learner\'s skill, status, and optional subtasks, suggest 3-5 specific, actionable practice tips.',
            'Each tip should be short (<= 1 sentence) and concrete.',
            'If a language is provided, keep examples relevant but do not require any translation.',
            '',
            `Skill: ${skillName}`,
            `Status: ${status}`,
            `Language: ${language || 'unspecified'}`,
            `Subtasks: ${subtasks.join('; ') || 'none'}`,
            '',
            'Respond as JSON: { "tips": ["...", "...", ...] }'
        ].join('\n');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
            signal
        });

        if (!res.ok) return null;

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        let tips = [];
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed.tips)) tips = parsed.tips.map(String);
            }
        } catch (_) { /* fallback */ }

        if (!tips.length) {
            tips = text
                .split(/\n|\r/)
                .map(s => s.replace(/^[-*•]\s*/, '').trim())
                .filter(Boolean)
                .slice(0, 5);
        }

        return tips.length ? tips : null;
    }

    async function getPracticeTipsForSkill(skill) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
        try {
            const serverTips = await callBackendForTips(skill, controller.signal);
            if (Array.isArray(serverTips) && serverTips.length) return serverTips;
        } catch (_) {
            // Ignore and fall back
        } finally {
            clearTimeout(t);
        }

        return buildHeuristicTips(skill);
    }

    // Usage tracking: per-user 5/day and global 1000/day
    function getLocalDayKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    async function checkAndIncrementPracticeTipsUsage() {
        try {
            if (!window.currentUser) {
                return { allowed: false, reason: 'auth', userCount: 0, userRemaining: 0, globalCount: 0, globalRemaining: 0 };
            }
            const MAX_USER = 5;
            const MAX_GLOBAL = 1000;
            const dateKey = getLocalDayKey();
            const globalRef = db.collection('daily_usage').doc(dateKey);
            const userRef = db.collection('users').doc(currentUser.uid).collection('usage').doc(dateKey);

            const result = await db.runTransaction(async (t) => {
                const gDoc = await t.get(globalRef);
                const uDoc = await t.get(userRef);
                const gCount = gDoc.exists ? (gDoc.data().count || 0) : 0;
                const uCount = uDoc.exists ? (uDoc.data().count || 0) : 0;

                if (gCount >= MAX_GLOBAL) {
                    return { allowed: false, reason: 'global', userCount: uCount, userRemaining: Math.max(0, MAX_USER - uCount), globalCount: gCount, globalRemaining: 0 };
                }
                if (uCount >= MAX_USER) {
                    return { allowed: false, reason: 'user', userCount: uCount, userRemaining: 0, globalCount: gCount, globalRemaining: Math.max(0, MAX_GLOBAL - gCount) };
                }

                t.set(globalRef, { count: firebase.firestore.FieldValue.increment(1), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                t.set(userRef, { count: firebase.firestore.FieldValue.increment(1), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

                const newU = uCount + 1;
                const newG = gCount + 1;
                return { allowed: true, userCount: newU, userRemaining: Math.max(0, MAX_USER - newU), globalCount: newG, globalRemaining: Math.max(0, MAX_GLOBAL - newG) };
            });

            return result;
        } catch (err) {
            console.warn('Usage tracking error:', err);
            return { allowed: false, reason: 'error', userCount: 0, userRemaining: 0, globalCount: 0, globalRemaining: 0 };
        }
    }

    // Expose globally
    window.getPracticeTipsForSkill = getPracticeTipsForSkill;
    window.checkAndIncrementPracticeTipsUsage = checkAndIncrementPracticeTipsUsage;
})();
