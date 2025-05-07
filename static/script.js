const dropArea = document.getElementById('upload-area');
const fileInput = document.getElementById('fileElem');
const uploadButton = document.getElementById('upload-button');
const loadingSpinner = document.getElementById('loading-spinner');
const csvArea = document.getElementById('csv-area');
const mainContent = document.querySelector('.main');

// Prevent double triggering of file input dialog
uploadButton.addEventListener('click', (e) => {
  e.stopPropagation(); // Stop the event from propagating to the dropArea
  fileInput.click();
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('highlight');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('highlight');
  const file = e.dataTransfer.files[0];
  uploadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    uploadFile(fileInput.files[0]);
  }
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Show the loading spinner and blur the background
  loadingSpinner.hidden = false;
  mainContent.classList.add('blurred');

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      // Hide the loading spinner and remove the blur
      loadingSpinner.hidden = true;
      mainContent.classList.remove('blurred');

      if (data.error) {
        alert(data.error);
      } else {
        displayTable(data.content);
        populateColumnChecklist(data.columns); // Populate the column checklist
      }
    })
    .catch(err => {
      // Hide the loading spinner and remove the blur
      loadingSpinner.hidden = true;
      mainContent.classList.remove('blurred');

      alert('Error uploading file');
      console.error(err);
    });
}

function displayTable(csvContent) {
  const rows = csvContent.split('\n').filter(row => row.trim() !== '');
  const table = document.createElement('table');
  table.classList.add('csv-table');

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    const cells = row.split(',');

    cells.forEach(cell => {
      const cellElement = rowIndex === 0 ? document.createElement('th') : document.createElement('td');
      cellElement.textContent = cell.trim();
      tr.appendChild(cellElement);
    });

    table.appendChild(tr);
  });

  const tableContainer = document.createElement('div');
  tableContainer.classList.add('csv-table-container');
  tableContainer.appendChild(table);

  const csvArea = document.getElementById('csv-area');
  csvArea.style.display = 'flex'; // Make the CSV area visible
  csvArea.innerHTML = ''; // Clear any existing content
  csvArea.appendChild(tableContainer);

  // Populate the column checklist
  if (rows.length > 0) {
    const columns = rows[0].split(',').map(col => col.trim());
    populateColumnChecklist(columns);
  }
}
