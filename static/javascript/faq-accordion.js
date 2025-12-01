// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const answer = button.nextElementSibling;
        const isOpen = !answer.classList.contains('hidden');

        // Close all answers
        document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));

        // Open this one if it wasn't open
        if (!isOpen) {
            answer.classList.remove('hidden');
        }
    });
});
