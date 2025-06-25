// Print/Download PDF Modal Elements
const printPdfBtn = document.getElementById('printPdfBtn');
const printPdfModal = document.getElementById('printPdfModal');
const closePrintPdfModalBtn = document.getElementById('closePrintPdfModalBtn');
const vocabListsContainer = document.getElementById('vocabListsContainer');

// Add buttons for view, print, and download
const viewPdfBtn = document.getElementById('viewPdfBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

// Fetch dynamic vocabulary lists from the DOM or a data source
function getDynamicVocabLists() {
    const vocabLists = [];
    const categories = document.querySelectorAll('#vocabularyList .category-container');

    if (categories.length === 0) {
        console.warn('No categories found in #vocabularyList.');
        return vocabLists;
    }

    categories.forEach(category => {
        const categoryHeader = category.querySelector('.category-header h3');
        if (!categoryHeader) {
            console.warn('Category header not found for a category container:', category);
            return;
        }

        const categoryName = categoryHeader.textContent.split(' (')[0];
        const items = Array.from(category.querySelectorAll('.category-content .vocab-item')).map(item => {
            const vocabWord = item.querySelector('.font-medium');
            const translation = item.querySelector('.translation-text');

            if (!vocabWord) {
                console.warn('Vocab word not found for an item in category:', categoryName, item);
                return null;
            }

            return {
                word: vocabWord.textContent,
                translation: translation ? translation.textContent : ''
            };
        }).filter(Boolean); // Remove null values

        vocabLists.push({ name: categoryName, items });
    });

    return vocabLists;
}

const openPrintPdfModalBtn = document.getElementById('openPrintPdfModalBtn');

// Open modal
openPrintPdfModalBtn.addEventListener('click', () => {
    vocabListsContainer.innerHTML = '';
    const vocabLists = getDynamicVocabLists();

    vocabLists.forEach((list, index) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `list-${index}`;
        checkbox.value = list.name;
        checkbox.checked = list.name === 'General';

        const label = document.createElement('label');
        label.htmlFor = `list-${index}`;
        label.textContent = list.name;

        const div = document.createElement('div');
        div.classList.add('flex', 'items-center', 'gap-2', 'mb-2');
        div.appendChild(checkbox);
        div.appendChild(label);

        vocabListsContainer.appendChild(div);
    });

    printPdfModal.classList.remove('hidden');
});

// Close modal
closePrintPdfModalBtn.addEventListener('click', () => {
    printPdfModal.classList.add('hidden');
});

// Generate PDF
function generatePdf(action) {
    const selectedLists = Array.from(vocabListsContainer.querySelectorAll('input:checked'))
        .map(input => input.value);

    if (selectedLists.length === 0) {
        alert('Please select at least one list.');
        return;
    }

    const vocabLists = getDynamicVocabLists();
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({
        unit: 'pt',
        format: 'letter',
        orientation: 'portrait'
    });

    const margin = 40; // Set page margin
    let y = margin; // Adjust starting y-coordinate to account for the margin

    // Add title with styling
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50); // Dark gray text
    doc.text('Vocabulary Lists', doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += 30; // Add spacing after title

    selectedLists.forEach(listName => {
        const list = vocabLists.find(l => l.name === listName);
        if (list) {
            // Add list header with background
            doc.setFillColor(230, 230, 230); // Light gray background
            doc.rect(margin, y - 15, doc.internal.pageSize.width - margin * 2, 20, 'F');
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0); // Black text
            doc.text(list.name, margin + 10, y);
            y += 30; // Add spacing after list header

            list.items.forEach(item => {
                // Add vocabulary word with bullet point
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text('• ' + item.word, margin + 10, y);
                y += 15; // Add spacing after word

                if (item.translation) {
                    // Add translation with indentation
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100, 100, 100); // Dark gray text
                    doc.text('Translation: ' + item.translation, margin + 30, y);
                    y += 15; // Add spacing after translation

                    // Reset text color to black for subsequent vocab words
                    doc.setTextColor(0, 0, 0);
                }
            });

            y += 20; // Add spacing between lists

            // Add separator if not the last list
            if (listName !== selectedLists[selectedLists.length - 1]) {
                doc.setDrawColor(200);
                doc.setLineWidth(0.5);
                doc.line(margin, y, doc.internal.pageSize.width - margin, y);
                y += 20; // Add spacing after separator
            }
        }
    });

    const fileTitle = 'Vocabulary_List_' + selectedLists.join('_') + '.pdf';

    if (action === 'view') {
        const pdfData = doc.output('bloburl');
        window.open(pdfData, '_blank');
    } else if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    } else if (action === 'download') {
        doc.save(fileTitle);
    }

    printPdfModal.classList.add('hidden');
}

// Event listeners for actions
viewPdfBtn.addEventListener('click', () => generatePdf('view'));
printPdfBtn.addEventListener('click', () => generatePdf('print'));
downloadPdfBtn.addEventListener('click', () => generatePdf('download'));
