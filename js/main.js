// Define SCALE globally
const SCALE = 1000000;

document.addEventListener('DOMContentLoaded', function() {
    const pipeInputsContainer = document.getElementById('pipe-inputs');
    const addPipeButton = document.getElementById('add-pipe-button');
    const findSolutionButton = document.getElementById('find-solution-button');
    const availablePipesTableBody = document.getElementById('available-pipes-table').querySelector('tbody');
    const solutionSection = document.getElementById('solution-section');
    const solutionParagraph = document.getElementById('solution');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Initialize with one pipe input row
    addPipeInputRow();

    addPipeButton.addEventListener('click', addPipeInputRow);

    findSolutionButton.addEventListener('click', function() {
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        solutionParagraph.textContent = ''; // Clear previous messages
        // Clear previous solutions
        const existingSolutions = solutionSection.querySelectorAll('.solution');
        existingSolutions.forEach(sol => sol.remove());

        setTimeout(() => { // Simulate processing delay
            const desiredLengthInput = document.getElementById('desired-length').value.trim();
            const desiredLength = parseFloat(desiredLengthInput);

            if (desiredLengthInput === '' || isNaN(desiredLength) || desiredLength <= 0) {
                alert('Please enter a valid desired length (a positive number with up to six decimal places).');
                loadingIndicator.style.display = 'none';
                return;
            }

            const availablePipes = [];

            // Collect pipe inputs
            const pipeRows = pipeInputsContainer.getElementsByClassName('pipe-row');
            if (pipeRows.length === 0) {
                alert('Please add at least one available pipe.');
                loadingIndicator.style.display = 'none';
                return;
            }

            for (let row of pipeRows) {
                const lengthInput = row.querySelector('.pipe-length').value.trim();
                const numberInput = row.querySelector('.pipe-number').value.trim();

                const length = parseFloat(lengthInput);
                const numPipes = parseInt(numberInput);

                if (lengthInput === '' || numberInput === '' || isNaN(length) || isNaN(numPipes) || length <= 0 || numPipes <= 0) {
                    alert('Please enter valid pipe lengths and numbers (positive numbers).');
                    loadingIndicator.style.display = 'none';
                    return;
                }

                availablePipes.push([length, numPipes]);
            }

            // Display available pipes
            displayAvailablePipes(availablePipes);

            // Find solutions
            const solutions = findTopSolutions(desiredLength, availablePipes, 10);

            // Display solutions
            displaySolutions(solutions, desiredLength);

            // Add to history
            addToHistory(desiredLength, availablePipes, solutions);

            // Load history from localStorage
            loadHistory();

            // Hide loading indicator
            loadingIndicator.style.display = 'none';

            // Log the 'find_solutions' event with desired_length and number_of_pipes
            analytics.logEvent('find_solutions', { 
                desired_length: desiredLength, 
                number_of_pipes: availablePipes.length 
            });
        }, 500); // Adjust delay as needed
    });

    clearHistoryButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the calculation history?')) {
            localStorage.removeItem('calculationHistory');
            loadHistory();
        }
    });

    function addPipeInputRow() {
        const pipeRow = document.createElement('div');
        pipeRow.className = 'pipe-row';

        const lengthInput = document.createElement('input');
        lengthInput.type = 'number';
        lengthInput.step = '0.000001';
        lengthInput.min = '0';
        lengthInput.placeholder = 'Pipe Length (e.g., 25.500000)';
        lengthInput.className = 'pipe-length';
        lengthInput.required = true;

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = '1';
        numberInput.placeholder = 'Number of Pipes';
        numberInput.className = 'pipe-number';
        numberInput.required = true;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = '🗑️';
        removeButton.title = 'Remove Pipe';
        removeButton.setAttribute('aria-label', 'Remove this pipe input row');
        removeButton.addEventListener('click', function() {
            pipeInputsContainer.removeChild(pipeRow);
        });

        pipeRow.appendChild(lengthInput);
        pipeRow.appendChild(numberInput);
        pipeRow.appendChild(removeButton);

        pipeInputsContainer.appendChild(pipeRow);
    }

    function displayAvailablePipes(availablePipes) {
        // Clear existing table rows
        availablePipesTableBody.innerHTML = '';

        for (let [length, num] of availablePipes) {
            const row = document.createElement('tr');

            const lengthCell = document.createElement('td');
            lengthCell.textContent = length.toFixed(6);

            const numCell = document.createElement('td');
            numCell.textContent = num;

            row.appendChild(lengthCell);
            row.appendChild(numCell);

            availablePipesTableBody.appendChild(row);
        }
    }

    function displaySolutions(solutions, desiredLength) {
        if (solutions.length === 0) {
            solutionParagraph.textContent = 'No solution found.';
            return;
        }

        // Iterate through solutions and display them
        solutions.forEach((solutionObj, index) => {
            const solutionDiv = document.createElement('div');
            solutionDiv.className = 'solution';

            const title = document.createElement('h3');
            title.textContent = `Solution ${index + 1}:`;
            title.style.color = 'var(--primary-color)';
            title.style.fontFamily = 'var(--font-secondary)';
            title.style.fontSize = '1.2rem';
            title.style.marginBottom = '10px';
            solutionDiv.appendChild(title);

            const ul = document.createElement('ul');
            for (let [pipe, count] of Object.entries(solutionObj.pipeCounts)) {
                const li = document.createElement('li');
                // Scale down the pipe length before displaying
                const displayPipeLength = (parseFloat(pipe) / SCALE).toFixed(6);
                li.textContent = `Pipe Length: ${displayPipeLength} x ${count}`;
                ul.appendChild(li);
            }
            solutionDiv.appendChild(ul);

            const totalLengthP = document.createElement('p');
            totalLengthP.innerHTML = `<strong>Total Length:</strong> ${solutionObj.totalLength.toFixed(6)}`;
            solutionDiv.appendChild(totalLengthP);

            const deviationP = document.createElement('p');
            let deviationClass;
            let deviationDirection;
            if (solutionObj.deviationValue > 0) {
                deviationClass = 'deviation-over';
                deviationDirection = 'Over';
            } else if (solutionObj.deviationValue < 0) {
                deviationClass = 'deviation-under';
                deviationDirection = 'Under';
            } else {
                deviationClass = 'deviation-exact';
                deviationDirection = 'Exact Match';
            }

            deviationP.innerHTML = `<strong>Deviation from Desired Length:</strong> <span class="${deviationClass}">${Math.abs(solutionObj.deviationValue).toFixed(6)}</span> (${deviationDirection})`;
            solutionDiv.appendChild(deviationP);

            solutionSection.appendChild(solutionDiv);

            // Trigger the animation
            setTimeout(() => {
                solutionDiv.classList.add('show');
            }, 100); // slight delay for smoothness
        });
    }

    function findTopSolutions(desiredLength, availablePipes, topN) {
        // Convert desired length to integer
        const desiredLengthInt = Math.round(desiredLength * SCALE);

        // Clone available pipes and scale to integers
        const pipes = availablePipes.map(([length, num]) => [Math.round(length * SCALE), num]);

        // Sort pipes in descending order of length
        pipes.sort((a, b) => b[0] - a[0]);

        // Initialize remaining stock
        const remainingStock = {};
        pipes.forEach(([length, num]) => {
            remainingStock[length] = num;
        });

        const solutions = [];

        // Backtracking function
        function backtrack(currentSolution, currentLength, startIndex) {
            // Calculate deviation
            const deviation = desiredLengthInt - currentLength;

            if (deviation < 0) {
                // Exceeded desired length
                return;
            }

            // If current solution is a valid solution (avoid empty solution)
            if (currentLength > 0) {
                const deviationValue = currentLength - desiredLengthInt;
                solutions.push({
                    pipeCounts: { ...currentSolution },
                    totalLength: currentLength / SCALE,
                    deviationValue: deviationValue / SCALE
                });
            }

            // Iterate through available pipes starting from startIndex
            for (let i = startIndex; i < pipes.length; i++) {
                const [pipeLength, pipeCount] = pipes[i];

                if (remainingStock[pipeLength] > 0 && (currentLength + pipeLength) <= desiredLengthInt) {
                    // Choose the pipe
                    remainingStock[pipeLength] -= 1;
                    currentSolution[pipeLength] = (currentSolution[pipeLength] || 0) + 1;

                    // Recurse
                    backtrack(currentSolution, currentLength + pipeLength, i);

                    // Backtrack
                    remainingStock[pipeLength] += 1;
                    currentSolution[pipeLength] -= 1;
                    if (currentSolution[pipeLength] === 0) {
                        delete currentSolution[pipeLength];
                    }
                }
            }
        }

        // Start backtracking
        backtrack({}, 0, 0);

        // Sort solutions by absolute deviation
        solutions.sort((a, b) => Math.abs(a.deviationValue) - Math.abs(b.deviationValue));

        // Remove duplicates if any and pick topN
        const uniqueSolutions = [];
        const seen = new Set();

        for (let sol of solutions) {
            const key = Object.entries(sol.pipeCounts).sort().map(([k, v]) => `${k}:${v}`).join('|');
            if (!seen.has(key)) {
                uniqueSolutions.push(sol);
                seen.add(key);
            }
            if (uniqueSolutions.length >= topN) {
                break;
            }
        }

        return uniqueSolutions;
    }

    // Function to add a calculation to history
    function addToHistory(desiredLength, availablePipes, solutions) {
        const history = JSON.parse(localStorage.getItem('calculationHistory')) || [];
        const timestamp = new Date().toLocaleString();

        const historyEntry = {
            timestamp,
            desiredLength: desiredLength.toFixed(6),
            availablePipes: availablePipes.map(([length, num]) => ({
                length: length.toFixed(6),
                number: num
            })),
            solutions: solutions.map((sol, index) => ({
                solutionNumber: index + 1,
                pipeCounts: Object.entries(sol.pipeCounts).map(([pipe, count]) => ({
                    pipeLength: (parseFloat(pipe) / SCALE).toFixed(6),
                    count
                })),
                totalLength: sol.totalLength.toFixed(6),
                deviationValue: sol.deviationValue.toFixed(6),
                deviationDirection: sol.deviationValue > 0 ? 'Over' :
                                      sol.deviationValue < 0 ? 'Under' : 'Exact Match'
            }))
        };

        history.unshift(historyEntry); // Add to the beginning
        localStorage.setItem('calculationHistory', JSON.stringify(history));

        // Keep only the latest 50 entries to prevent excessive storage usage
        if (history.length > 50) {
            history.pop();
            localStorage.setItem('calculationHistory', JSON.stringify(history));
        }
    }

    // Function to load and display history from localStorage
    function loadHistory() {
        historyList.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('calculationHistory')) || [];

        if (history.length === 0) {
            historyList.innerHTML = '<p>No history available.</p>';
            return;
        }

        history.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const timestampP = document.createElement('p');
            timestampP.innerHTML = `<strong>Timestamp:</strong> ${entry.timestamp}`;
            historyItem.appendChild(timestampP);

            const desiredLengthP = document.createElement('p');
            desiredLengthP.innerHTML = `<strong>Desired Length:</strong> ${entry.desiredLength}`;
            historyItem.appendChild(desiredLengthP);

            const availablePipesP = document.createElement('p');
            availablePipesP.innerHTML = `<strong>Available Pipes:</strong> ${entry.availablePipes.map(pipe => `${pipe.length} x ${pipe.number}`).join(', ')}`;
            historyItem.appendChild(availablePipesP);

            const solutionsHeader = document.createElement('p');
            solutionsHeader.innerHTML = `<strong>Solutions:</strong>`;
            historyItem.appendChild(solutionsHeader);

            const solutionsList = document.createElement('ul');
            entry.solutions.forEach(sol => {
                const solItem = document.createElement('li');
                solItem.innerHTML = `
                    <strong>Solution ${sol.solutionNumber}:</strong> 
                    Pipes - ${sol.pipeCounts.map(pipe => `${pipe.pipeLength} x ${pipe.count}`).join(', ')}, 
                    Total Length - ${sol.totalLength}, 
                    Deviation - ${Math.abs(sol.deviationValue)} (${sol.deviationDirection})
                `;
                solutionsList.appendChild(solItem);
            });
            historyItem.appendChild(solutionsList);

            historyList.appendChild(historyItem);
        });
    }

    // Initial load of history on page load
    loadHistory();

});
