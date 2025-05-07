const dropArea = document.getElementById('upload-area');
const fileInput = document.getElementById('fileElem');
const uploadButton = document.getElementById('upload-button');
const loadingSpinner = document.getElementById('loading-spinner');
const csvArea = document.getElementById('csv-area');
const mainContent = document.querySelector('.main');

// Add this at the top with your other constants
const blurOverlay = document.createElement('div');
blurOverlay.className = 'blur-overlay';
document.body.appendChild(blurOverlay);
blurOverlay.style.display = 'none';

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

  // Show the loading spinner and blur overlay
  loadingSpinner.hidden = false;
  blurOverlay.style.display = 'block';
  mainContent.classList.add('blurred');

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      // Hide the loading spinner and blur overlay
      loadingSpinner.hidden = true;
      blurOverlay.style.display = 'none';
      mainContent.classList.remove('blurred');

      if (data.error) {
        alert(data.error);
      } else if (data.success && data.table) {
        // Hide the drop area
        dropArea.style.display = 'none';
        
        // Display the HTML table returned from the server
        const csvArea = document.getElementById('csv-area');
        csvArea.style.display = 'flex';
        csvArea.innerHTML = data.table;
        
        // Add table styling
        const table = csvArea.querySelector('table');
        if (table) {
          table.classList.add('table', 'table-striped', 'table-bordered');
        }
      }
    })
    .catch(err => {
      // Hide the loading spinner and blur overlay
      loadingSpinner.hidden = true;
      blurOverlay.style.display = 'none';
      mainContent.classList.remove('blurred');

      alert('Error uploading file');
      console.error(err);
    });
}
