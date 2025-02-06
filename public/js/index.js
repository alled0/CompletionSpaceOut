
let pipes = [];

function addPipe() {
  const lengthInput = document.getElementById("pipe-length");
  const countInput = document.getElementById("pipe-count");

  const length = parseFloat(lengthInput.value);
  const count = parseInt(countInput.value);

  if (!length || !count || length <= 0 || count <= 0) {
    alert("Enter valid pipe length and count.");
    return;
  }

  pipes.push({ length, count });
  displayPipes();

  // ✅ Clear pipe length, but keep count for easy multi-addition
  lengthInput.value = "";
  countInput.value = "";
  lengthInput.focus();
}

function displayPipes() {
  const tableBody = document.getElementById("pipe-table").getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";

  pipes.forEach((pipe, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${pipe.length.toFixed(2)}</td>
      <td>${pipe.count}</td>
      <td><button class="remove-btn" onclick="removePipe(${index})">Remove</button></td>
    `;
    tableBody.appendChild(row);
  });
}

function removePipe(index) {
  pipes.splice(index, 1);
  displayPipes();
}

function findBestSolution() {
  const desiredLength = parseFloat(document.getElementById("desired-length").value);
  if (!desiredLength || desiredLength <= 0) {
    alert("Enter a valid desired length.");
    return;
  }

  const bestSolutions = getSolutions(desiredLength);
  displaySolutions(bestSolutions);
}

function getSolutions(desiredLength) {
  const solutions = [];

  function backtrack(path, currentLength, index) {
    if (currentLength > 0) {
      const deviation = currentLength - desiredLength;
      solutions.push({ path: [...path], totalLength: currentLength, deviation });
    }

    for (let i = index; i < pipes.length; i++) {
      const pipe = pipes[i];
      if (pipe.count > 0) {
        pipe.count--;
        path.push(pipe.length);
        backtrack(path, currentLength + pipe.length, i);
        pipe.count++;
        path.pop();
      }
    }
  }

  backtrack([], 0, 0);
  solutions.sort((a, b) => Math.abs(a.deviation) - Math.abs(b.deviation));
  
  return solutions.slice(0, 5); // Top 5 solutions
}

function displaySolutions(solutions) {
  const solutionsList = document.getElementById("solutions-list");
  solutionsList.innerHTML = "";

  if (solutions.length === 0) {
    solutionsList.innerHTML = "<p>No solution found.</p>";
    return;
  }

  solutions.forEach((solution, index) => {
    // Apply the correct deviation class for color coding
    const deviationClass = 
      solution.deviation > 0 ? "deviation-over" :
      solution.deviation < 0 ? "deviation-under" : "deviation-exact";

    // Create a solution card with proper styles
    const solutionCard = document.createElement("div");
    solutionCard.classList.add("solution-card");

    solutionCard.innerHTML = `
      <h4>Solution ${index + 1}</h4>
      <p><strong>Total Length:</strong> ${solution.totalLength.toFixed(2)}</p>
      <p class="${deviationClass}"><strong>Deviation:</strong> ${solution.deviation.toFixed(2)}</p>
      <p><strong>Pipes Used:</strong> ${solution.path.join("m, ")}m</p>
    `;

    solutionsList.appendChild(solutionCard);
  });
}
