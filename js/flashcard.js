/**
 * Flashcard Review Mode Module
 * Provides quick review functionality for vocabulary practice
 */

let flashcardReviewList = [];
let currentFlashcardIndex = 0;
let isFlashcardFlipped = false;
let flashcardRenderToken = 0;

const flashcardModal = document.getElementById('flashcardModal');
const flashcard = document.getElementById('flashcard');
const flashcardWord = document.getElementById('flashcardWord');
const flashcardTranslation = document.getElementById('flashcardTranslation');
const flashcardMedia = document.getElementById('flashcardMedia');
const flashcardVideo = document.getElementById('flashcardVideo');
const flashcardVideoWrap = document.getElementById('flashcardVideoWrap');
const flashcardAudioWrap = document.getElementById('flashcardAudioWrap');
const flashcardAudio = document.getElementById('flashcardAudio');
const flashcardCounter = document.getElementById('flashcardCounter');
const flashcardProgress = document.getElementById('flashcardProgress');
const proficientBadge = document.getElementById('masteredBadge');
const startReviewBtn = document.getElementById('startReviewBtn');
const closeFlashcardBtn = document.getElementById('closeFlashcardBtn');
const flashcardPrev = document.getElementById('flashcardPrev');
const flashcardNext = document.getElementById('flashcardNext');
const flashcardFlip = document.getElementById('flashcardFlip');
const flashcardNotStarted = document.getElementById('flashcardNotStarted');
const flashcardInProgress = document.getElementById('flashcardInProgress');
const flashcardProficient = document.getElementById('flashcardProficient');
const FLASHCARD_TARGET_COUNT = 10;

// Start review session
startReviewBtn?.addEventListener('click', () => {
    if (!vocabularyList || vocabularyList.length === 0) {
        showToast('No vocabulary to review!');
        return;
    }

    const duePool = vocabularyList.filter(item => isVocabularyItemDue(item));
    if (duePool.length === 0) {
        showToast('No words are due right now. Great work!');
        return;
    }

    flashcardReviewList = buildDueFirstReviewList(vocabularyList, FLASHCARD_TARGET_COUNT);
    const dueCountInSession = flashcardReviewList.filter(item => isVocabularyItemDue(item)).length;
    showToast(`${dueCountInSession} due card${dueCountInSession === 1 ? '' : 's'} in this session`);

    currentFlashcardIndex = 0;
    isFlashcardFlipped = false;
    flashcardModal.classList.remove('hidden');
    renderFlashcard();
    flashcard.focus();
});

// Close modal
closeFlashcardBtn?.addEventListener('click', () => {
    flashcardModal.classList.add('hidden');
    if (flashcardVideo) {
        flashcardVideo.src = '';
    }
    if (flashcardAudio) {
        flashcardAudio.src = '';
    }
    renderVocabularyWithCurrentFilter();
});

// Close on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !flashcardModal.classList.contains('hidden')) {
        flashcardModal.classList.add('hidden');
        if (flashcardVideo) {
            flashcardVideo.src = '';
        }
        if (flashcardAudio) {
            flashcardAudio.src = '';
        }
        renderVocabularyWithCurrentFilter();
    }
});

// Flip card on click or space
flashcard?.addEventListener('click', flipCard);
flashcard?.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        flipCard();
    }
});

// Mobile flip button
flashcardFlip?.addEventListener('click', flipCard);

function flipCard() {
    isFlashcardFlipped = !isFlashcardFlipped;
    flashcard.classList.toggle('flipped');
}

// Navigation
flashcardPrev?.addEventListener('click', () => {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        isFlashcardFlipped = false;
        flashcard.classList.remove('flipped');
        renderFlashcard();
    }
});

flashcardNext?.addEventListener('click', () => {
    if (currentFlashcardIndex < flashcardReviewList.length - 1) {
        currentFlashcardIndex++;
        isFlashcardFlipped = false;
        flashcard.classList.remove('flipped');
        renderFlashcard();
    } else {
        // End of review
        showToast('🎉 Review complete!');
        flashcardModal.classList.add('hidden');
        renderVocabularyWithCurrentFilter();
    }
});

// Status buttons
flashcardNotStarted?.addEventListener('click', () => {
    updateFlashcardStatus(PROGRESS_STATUS.NOT_STARTED);
    highlightButton(flashcardNotStarted);
});
flashcardInProgress?.addEventListener('click', () => {
    updateFlashcardStatus(PROGRESS_STATUS.IN_PROGRESS);
    highlightButton(flashcardInProgress);
});
flashcardProficient?.addEventListener('click', () => {
    updateFlashcardStatus(PROGRESS_STATUS.PROFICIENT);
    highlightButton(flashcardProficient);
});

function highlightButton(button) {
    // Remove highlight from all buttons
    [flashcardNotStarted, flashcardInProgress, flashcardProficient].forEach(btn => {
        btn?.classList.remove('active-status-button');
    });
    // Add highlight to clicked button
    button?.classList.add('active-status-button');
}

async function updateFlashcardStatus(newStatus) {
    const currentItem = flashcardReviewList[currentFlashcardIndex];
    if (!currentItem) return;

    try {
        const updated = await updateVocabularyStatus(currentItem.id, newStatus);
        currentItem.status = newStatus;
        if (updated) {
            Object.assign(currentItem, updated);
        }

        // Update in main vocabulary list
        const mainItem = vocabularyList.find(v => v.id === currentItem.id);
        if (mainItem) {
            if (updated) {
                Object.assign(mainItem, updated);
            } else {
                mainItem.status = newStatus;
            }
        }

        // If proficient, remove from review list
        if (newStatus === PROGRESS_STATUS.PROFICIENT) {
            flashcardReviewList.splice(currentFlashcardIndex, 1);

            if (flashcardReviewList.length === 0) {
                showToast('🎉 All words reviewed!');
                flashcardModal.classList.add('hidden');
                renderVocabularyWithCurrentFilter();
                return;
            }

            // Stay at same index (which now shows next card)
            if (currentFlashcardIndex >= flashcardReviewList.length) {
                currentFlashcardIndex = flashcardReviewList.length - 1;
            }
        }

        isFlashcardFlipped = false;
        flashcard.classList.remove('flipped');
        renderFlashcard();

        const statusText = newStatus === PROGRESS_STATUS.NOT_STARTED ? 'Not Started' :
            newStatus === PROGRESS_STATUS.IN_PROGRESS ? 'In Progress' : 'Proficient';
        showToast(`Marked as ${statusText}`);
    } catch (error) {
        showToast('Error updating status');
    }
}

function shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildDueFirstReviewList(items, targetCount) {
    const selected = [];
    const selectedIds = new Set();

    const dueItems = [...items]
        .filter(item => isVocabularyItemDue(item))
        .sort((a, b) => getVocabularyDueTimestamp(a) - getVocabularyDueTimestamp(b));

    dueItems.slice(0, targetCount).forEach(item => {
        selected.push(item);
        selectedIds.add(item.id);
    });

    if (selected.length >= targetCount) {
        return shuffleArray(selected);
    }

    const remaining = items.filter(item => !selectedIds.has(item.id));
    const notStarted = shuffleArray(remaining.filter(item => item.status === PROGRESS_STATUS.NOT_STARTED));
    const inProgress = shuffleArray(remaining.filter(item => item.status === PROGRESS_STATUS.IN_PROGRESS));
    const proficient = shuffleArray(remaining.filter(item => item.status === PROGRESS_STATUS.PROFICIENT));

    const slotsLeft = targetCount - selected.length;
    const targetNotStarted = Math.ceil(slotsLeft * 0.5);
    const targetInProgress = Math.ceil(slotsLeft * 0.35);

    const pick = (source, count) => {
        source.slice(0, count).forEach(item => {
            if (selectedIds.has(item.id)) return;
            selected.push(item);
            selectedIds.add(item.id);
        });
    };

    pick(notStarted, targetNotStarted);
    pick(inProgress, targetInProgress);
    pick(proficient, targetCount - selected.length);

    if (selected.length < targetCount) {
        const fallback = shuffleArray(items.filter(item => !selectedIds.has(item.id)));
        pick(fallback, targetCount - selected.length);
    }

    return shuffleArray(selected);
}

async function renderFlashcard() {
    const currentItem = flashcardReviewList[currentFlashcardIndex];
    if (!currentItem) return;

    const renderToken = ++flashcardRenderToken;

    flashcardWord.textContent = currentItem.word;

    // Highlight the button that matches this item's current status
    [flashcardNotStarted, flashcardInProgress, flashcardProficient].forEach(btn => {
        btn?.classList.remove('active-status-button');
    });
    if (currentItem.status === PROGRESS_STATUS.NOT_STARTED) {
        flashcardNotStarted?.classList.add('active-status-button');
    } else if (currentItem.status === PROGRESS_STATUS.IN_PROGRESS) {
        flashcardInProgress?.classList.add('active-status-button');
    } else if (currentItem.status === PROGRESS_STATUS.PROFICIENT) {
        flashcardProficient?.classList.add('active-status-button');
    }

    // Show proficient badge if item is already proficient
    if (proficientBadge) {
        proficientBadge.classList.toggle('hidden', currentItem.status !== PROGRESS_STATUS.PROFICIENT);
    }

    const translationText = currentItem.translation || '';
    const cleanedText = translationText.replace(/https?:\/\/\S+/gi, '').trim();

    const ytEmbed = getYouTubeEmbedUrl(translationText);
    const scEmbed = await getSoundCloudEmbedUrl(translationText);
    const hasMedia = Boolean(ytEmbed) || Boolean(scEmbed);

    // Show cleaned text if available, otherwise show nothing if there's media, otherwise "(no translation)"
    if (cleanedText) {
        flashcardTranslation.textContent = cleanedText;
    } else if (hasMedia) {
        flashcardTranslation.textContent = '';
    } else {
        flashcardTranslation.textContent = '(no translation)';
    }

    if (flashcardVideoWrap) {
        flashcardVideoWrap.classList.toggle('hidden', !ytEmbed);
    }
    if (flashcardVideo) {
        flashcardVideo.src = ytEmbed || '';
    }

    // Reset audio while resolving shortened SoundCloud links asynchronously
    if (flashcardAudioWrap) {
        flashcardAudioWrap.classList.add('hidden');
    }
    if (flashcardAudio) {
        flashcardAudio.src = '';
    }

    if (flashcardMedia) {
        flashcardMedia.classList.toggle('hidden', !hasMedia);
    }

    if (renderToken !== flashcardRenderToken) return;

    const hasAudio = Boolean(scEmbed);

    if (flashcardAudioWrap) {
        flashcardAudioWrap.classList.toggle('hidden', !hasAudio);
    }
    if (flashcardAudio) {
        flashcardAudio.src = hasAudio ? scEmbed : '';
    }
    if (flashcardMedia) {
        flashcardMedia.classList.toggle('hidden', !hasMedia);
    }
    flashcardCounter.textContent = `Card ${currentFlashcardIndex + 1} of ${flashcardReviewList.length}`;

    // Update progress bar
    const progress = ((currentFlashcardIndex + 1) / flashcardReviewList.length) * 100;
    flashcardProgress.style.width = `${progress}%`;

    // Update button states
    flashcardPrev.disabled = currentFlashcardIndex === 0;

    // Highlight current status
    flashcardNotStarted.classList.remove('ring-2', 'ring-gray-400');
    flashcardInProgress.classList.remove('ring-2', 'ring-yellow-500');
    flashcardProficient.classList.remove('ring-2', 'ring-green-500');

    if (currentItem.status === PROGRESS_STATUS.NOT_STARTED) {
        flashcardNotStarted.classList.add('ring-2', 'ring-gray-400');
    } else if (currentItem.status === PROGRESS_STATUS.IN_PROGRESS) {
        flashcardInProgress.classList.add('ring-2', 'ring-yellow-500');
    } else if (currentItem.status === PROGRESS_STATUS.PROFICIENT) {
        flashcardProficient.classList.add('ring-2', 'ring-green-500');
    }
}

async function getSoundCloudEmbedUrl(text) {
    if (!text) return null;

    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return null;

    try {
        const rawUrl = urlMatch[0];
        const url = new URL(rawUrl);
        const host = url.hostname;
        const isSoundCloud = host.includes('soundcloud.com') || host.includes('snd.sc') || host.includes('on.soundcloud.com');
        if (!isSoundCloud) return null;

        // Expand shortened SoundCloud links via oEmbed when possible
        const needsResolve = host.includes('on.soundcloud.com') || host.includes('snd.sc');
        const resolvedUrl = needsResolve ? await resolveSoundCloudUrl(rawUrl) : rawUrl;
        const encoded = encodeURIComponent(resolvedUrl);

        return `https://w.soundcloud.com/player/?url=${encoded}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
    } catch (e) {
        return null;
    }
}

async function resolveSoundCloudUrl(rawUrl) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(rawUrl)}&iframe=true`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return rawUrl;
        }

        const data = await response.json();
        if (!data?.html) return rawUrl;

        const srcMatch = data.html.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
            const playerUrl = new URL(srcMatch[1]);
            const resolved = playerUrl.searchParams.get('url');
            if (resolved) return resolved;
        }

        return rawUrl;
    } catch (e) {
        return rawUrl;
    }
}

function getYouTubeEmbedUrl(text) {
    if (!text) return null;

    // Find first URL in the text
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return null;

    try {
        const url = new URL(urlMatch[0]);
        // youtu.be/<id>
        if (url.hostname.includes('youtu.be')) {
            const id = url.pathname.split('/').filter(Boolean)[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        // youtube.com/watch?v=<id>
        if (url.hostname.includes('youtube.com')) {
            if (url.searchParams.has('v')) {
                const id = url.searchParams.get('v');
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
            // youtube.com/embed/<id>
            if (url.pathname.includes('/embed/')) {
                const parts = url.pathname.split('/');
                const id = parts[parts.indexOf('embed') + 1];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
        }
    } catch (e) {
        return null;
    }

    return null;
}

// Keyboard shortcuts for flashcard modal
document.addEventListener('keydown', (e) => {
    if (flashcardModal.classList.contains('hidden')) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            flashcardPrev.click();
            break;
        case 'ArrowRight':
            e.preventDefault();
            flashcardNext.click();
            break;
        case '1':
            e.preventDefault();
            flashcardNotStarted.click();
            break;
        case '2':
            e.preventDefault();
            flashcardInProgress.click();
            break;
        case '3':
            e.preventDefault();
            flashcardProficient.click();
            break;
    }
});
