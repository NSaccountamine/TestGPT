let age = null;
let education = null;
let trial = 0;
const totalTrials = 3;
const reactionTimes = [];
let waitingForClick = false;
let startTime = 0;

window.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('surveyForm');
    const gameSection = document.getElementById('game');
    const resultsSection = document.getElementById('results');
    const startBtn = document.getElementById('startBtn');
    const status = document.getElementById('status');

    surveyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        age = document.getElementById('age').value;
        education = document.getElementById('education').value;
        document.getElementById('survey').style.display = 'none';
        gameSection.style.display = 'block';
    });

    startBtn.addEventListener('click', () => {
        if (waitingForClick) {
            const end = performance.now();
            const rt = end - startTime;
            reactionTimes.push(rt);
            status.textContent = `Reaction time: ${Math.round(rt)} ms`;
            waitingForClick = false;
            startBtn.textContent = 'Start';
            startBtn.disabled = false;
            trial++;
            if (trial >= totalTrials) {
                showResults();
            }
        } else {
            startBtn.disabled = true;
            status.textContent = 'Get ready...';
            const delay = Math.random() * 3000 + 2000; // 2-5 seconds
            setTimeout(() => {
                status.textContent = 'Click now!';
                startBtn.textContent = 'Click!';
                startBtn.disabled = false;
                waitingForClick = true;
                startTime = performance.now();
            }, delay);
        }
    });

    function showResults() {
        gameSection.style.display = 'none';
        resultsSection.style.display = 'block';

        const timesDiv = document.getElementById('times');
        timesDiv.innerHTML = reactionTimes.map((t, i) => `Trial ${i + 1}: ${Math.round(t)} ms`).join('<br>');
        const avg = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
        document.getElementById('average').textContent = `Average: ${Math.round(avg)} ms`;

        const summary = {
            age,
            education,
            reactionTimes: reactionTimes.map(t => Math.round(t)),
            average: Math.round(avg)
        };
        document.getElementById('summary').textContent = JSON.stringify(summary, null, 2);
    }
});
