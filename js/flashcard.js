/**
 * Flashcard Review Mode Module
 * Provides quick review functionality for vocabulary practice
 */

let flashcardReviewList = [];
let currentFlashcardIndex = 0;
let isFlashcardFlipped = false;

const flashcardModal = document.getElementById('flashcardModal');
const flashcard = document.getElementById('flashcard');
const flashcardWord = document.getElementById('flashcardWord');
const flashcardTranslation = document.getElementById('flashcardTranslation');
const flashcardMedia = document.getElementById('flashcardMedia');
const flashcardVideo = document.getElementById('flashcardVideo');
const flashcardCounter = document.getElementById('flashcardCounter');
const flashcardProgress = document.getElementById('flashcardProgress');
const startReviewBtn = document.getElementById('startReviewBtn');
const closeFlashcardBtn = document.getElementById('closeFlashcardBtn');
const flashcardPrev = document.getElementById('flashcardPrev');
const flashcardNext = document.getElementById('flashcardNext');
const flashcardNotStarted = document.getElementById('flashcardNotStarted');
const flashcardInProgress = document.getElementById('flashcardInProgress');
const flashcardMastered = document.getElementById('flashcardMastered');

// Start review session
startReviewBtn?.addEventListener('click', () => {
    if (!vocabularyList || vocabularyList.length === 0) {
        showToast('No vocabulary to review!');
        return;
    }

    // Filter for not started and in progress items
    flashcardReviewList = vocabularyList.filter(item =>
        item.status === PROGRESS_STATUS.NOT_STARTED ||
        item.status === PROGRESS_STATUS.IN_PROGRESS
    );

    if (flashcardReviewList.length === 0) {
        showToast('No words to review! All words are mastered or add some new ones.');
        return;
    }

    // Shuffle the list for variety
    flashcardReviewList = flashcardReviewList.sort(() => Math.random() - 0.5);

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
    renderVocabularyWithCurrentFilter();
});

// Close on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !flashcardModal.classList.contains('hidden')) {
        flashcardModal.classList.add('hidden');
        if (flashcardVideo) {
            flashcardVideo.src = '';
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
flashcardNotStarted?.addEventListener('click', () => updateFlashcardStatus(PROGRESS_STATUS.NOT_STARTED));
flashcardInProgress?.addEventListener('click', () => updateFlashcardStatus(PROGRESS_STATUS.IN_PROGRESS));
flashcardMastered?.addEventListener('click', () => updateFlashcardStatus(PROGRESS_STATUS.MASTERED));

async function updateFlashcardStatus(newStatus) {
    const currentItem = flashcardReviewList[currentFlashcardIndex];
    if (!currentItem) return;

    try {
        await updateVocabularyStatus(currentItem.id, newStatus);
        currentItem.status = newStatus;

        // Update in main vocabulary list
        const mainItem = vocabularyList.find(v => v.id === currentItem.id);
        if (mainItem) {
            mainItem.status = newStatus;
        }

        // If mastered, remove from review list
        if (newStatus === PROGRESS_STATUS.MASTERED) {
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
            newStatus === PROGRESS_STATUS.IN_PROGRESS ? 'In Progress' : 'Mastered';
        showToast(`Marked as ${statusText}`);
    } catch (error) {
        showToast('Error updating status');
    }
}

function renderFlashcard() {
    const currentItem = flashcardReviewList[currentFlashcardIndex];
    if (!currentItem) return;

    flashcardWord.textContent = currentItem.word;

    const translationText = currentItem.translation || '';
    const cleanedText = translationText.replace(/https?:\/\/\S+/gi, '').trim();
    flashcardTranslation.textContent = cleanedText || '';

    // Handle YouTube embed if a link is present
    const embedUrl = getYouTubeEmbedUrl(translationText);
    if (embedUrl) {
        flashcardMedia.classList.remove('hidden');
        flashcardVideo.src = embedUrl;
    } else {
        flashcardMedia.classList.add('hidden');
        flashcardVideo.src = '';
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
    flashcardMastered.classList.remove('ring-2', 'ring-green-500');

    if (currentItem.status === PROGRESS_STATUS.NOT_STARTED) {
        flashcardNotStarted.classList.add('ring-2', 'ring-gray-400');
    } else if (currentItem.status === PROGRESS_STATUS.IN_PROGRESS) {
        flashcardInProgress.classList.add('ring-2', 'ring-yellow-500');
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
            flashcardMastered.click();
            break;
    }
});
