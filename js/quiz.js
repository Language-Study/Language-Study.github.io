/**
 * Vocabulary Quiz Mode
 * Multiple choice quiz based on existing vocabulary entries.
 */

let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

const QUIZ_TARGET_COUNT = 10;

const startQuizBtn = document.getElementById('startQuizBtn');
const quizModal = document.getElementById('quizModal');
const closeQuizBtn = document.getElementById('closeQuizBtn');
const quizPrompt = document.getElementById('quizPrompt');
const quizCounter = document.getElementById('quizCounter');
const quizScoreEl = document.getElementById('quizScore');
const quizOptions = document.getElementById('quizOptions');
const quizFeedback = document.getElementById('quizFeedback');
const quizNextBtn = document.getElementById('quizNextBtn');

function isLikelyUrl(value) {
    if (!value) return false;
    return /^https?:\/\//i.test(String(value).trim());
}

function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getQuizCandidates() {
    if (!Array.isArray(vocabularyList)) return [];

    return vocabularyList
        .filter(item => item && item.word && item.translation)
        .filter(item => !isLikelyUrl(item.translation))
        .map(item => ({
            id: item.id,
            word: String(item.word).trim(),
            translation: String(item.translation).trim()
        }))
        .filter(item => item.word.length > 0 && item.translation.length > 0);
}

function buildQuizQuestions(candidates, count) {
    const sampled = shuffle(candidates).slice(0, Math.min(count, candidates.length));

    return sampled.map(correct => {
        const distractors = shuffle(candidates.filter(item => item.id !== correct.id))
            .slice(0, 3)
            .map(item => item.word);

        const options = shuffle([correct.word, ...distractors]);
        return {
            prompt: correct.translation,
            correctWord: correct.word,
            options
        };
    }).filter(q => q.options.length === 4);
}

function updateQuizHeader() {
    quizCounter.textContent = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}`;
    quizScoreEl.textContent = `Score: ${quizScore}`;
}

function closeQuizModal() {
    quizModal.classList.add('hidden');
}

function openQuizModal() {
    quizModal.classList.remove('hidden');
}

function setFeedback(message, kind) {
    quizFeedback.textContent = message;
    quizFeedback.classList.remove('quiz-feedback-correct', 'quiz-feedback-wrong', 'text-gray-600');

    if (kind === 'correct') {
        quizFeedback.classList.add('quiz-feedback-correct');
    } else if (kind === 'wrong') {
        quizFeedback.classList.add('quiz-feedback-wrong');
    } else {
        quizFeedback.classList.add('text-gray-600');
    }
}

function renderQuizQuestion() {
    const question = quizQuestions[currentQuizIndex];
    if (!question) return;

    quizAnswered = false;
    quizNextBtn.disabled = true;
    quizNextBtn.textContent = currentQuizIndex === quizQuestions.length - 1 ? 'Finish' : 'Next';

    updateQuizHeader();
    quizPrompt.textContent = question.prompt;
    setFeedback('Select the word that matches this translation.', 'info');

    quizOptions.innerHTML = '';

    question.options.forEach((optionText, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'quiz-option-btn px-4 py-3 text-left rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors';
        optionBtn.textContent = `${index + 1}. ${optionText}`;
        optionBtn.dataset.answer = optionText;
        optionBtn.setAttribute('aria-label', `Option ${index + 1}: ${optionText}`);

        optionBtn.addEventListener('click', () => {
            if (quizAnswered) return;

            const isCorrect = optionText === question.correctWord;
            quizAnswered = true;
            quizNextBtn.disabled = false;

            Array.from(quizOptions.querySelectorAll('.quiz-option-btn')).forEach(btn => {
                const isRightAnswer = btn.dataset.answer === question.correctWord;
                btn.disabled = true;
                if (isRightAnswer) {
                    btn.classList.add('quiz-option-correct');
                }
            });

            if (isCorrect) {
                quizScore += 1;
                optionBtn.classList.add('quiz-option-correct');
                setFeedback('Correct!', 'correct');
            } else {
                optionBtn.classList.add('quiz-option-wrong');
                setFeedback(`Not quite. Correct answer: ${question.correctWord}`, 'wrong');
            }

            updateQuizHeader();
            quizNextBtn.focus();
        });

        quizOptions.appendChild(optionBtn);
    });

    const firstOption = quizOptions.querySelector('.quiz-option-btn');
    if (firstOption) firstOption.focus();
}

function startQuiz() {
    const candidates = getQuizCandidates();

    if (candidates.length < 4) {
        showToast('Add at least 4 vocabulary items with text translations to use Quiz Mode.');
        return;
    }

    quizQuestions = buildQuizQuestions(candidates, QUIZ_TARGET_COUNT);

    if (quizQuestions.length === 0) {
        showToast('Not enough eligible quiz items.');
        return;
    }

    currentQuizIndex = 0;
    quizScore = 0;
    openQuizModal();
    renderQuizQuestion();
}

startQuizBtn?.addEventListener('click', startQuiz);
closeQuizBtn?.addEventListener('click', closeQuizModal);

quizNextBtn?.addEventListener('click', () => {
    if (!quizAnswered) return;

    if (currentQuizIndex < quizQuestions.length - 1) {
        currentQuizIndex += 1;
        renderQuizQuestion();
        return;
    }

    closeQuizModal();
    showToast(`Quiz complete! Score: ${quizScore}/${quizQuestions.length}`);
});

document.addEventListener('keydown', (event) => {
    if (!quizModal || quizModal.classList.contains('hidden')) return;

    if (event.key === 'Escape') {
        closeQuizModal();
        return;
    }

    if (!quizAnswered && ['1', '2', '3', '4'].includes(event.key)) {
        const index = Number(event.key) - 1;
        const target = quizOptions.querySelectorAll('.quiz-option-btn')[index];
        if (target) {
            event.preventDefault();
            target.click();
        }
        return;
    }

    if (quizAnswered && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        quizNextBtn.click();
    }
});
