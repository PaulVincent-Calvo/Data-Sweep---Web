const dropArea = document.getElementById('upload-area');
const fileInput = document.getElementById('fileElem');
const uploadButton = document.getElementById('upload-button');
const loadingSpinner = document.getElementById('loading-spinner');
const csvArea = document.getElementById('csv-area');
const mainContent = document.querySelector('.main');


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
      } else if (data.success && data.columns) {
        // Hide the drop area
        dropArea.style.display = 'none';
        
        // Display the CSV table
        csvArea.hidden = false;
        csvArea.style.display = 'flex';
        csvArea.innerHTML = data.table;

        // Add table styling
        const table = csvArea.querySelector('table');
        if (table) {
          table.classList.add('table', 'table-striped', 'table-bordered');
        }
        
        const optionsArea = document.querySelector('.options-area');
        optionsArea.innerHTML = ''; 
        optionsArea.style.borderRadius = '0'; 
        optionsArea.style.justifyContent = 'flex-start'; 
        optionsArea.style.alignItems = 'flex-start'; 

        // Create checklist container
        const checklistContainer = document.createElement('div');
        checklistContainer.className = 'column-checklist';

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Select columns to delete:';
        checklistContainer.appendChild(title);

        // Add columns as checkboxes
        data.columns.forEach(column => {
          const checkboxDiv = document.createElement('div');
          checkboxDiv.className = 'checkbox-item';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `col-${column}`;
          checkbox.value = column;
          checkbox.checked = true; 

          const label = document.createElement('label');
          label.htmlFor = `col-${column}`;
          label.textContent = column;

          checkboxDiv.appendChild(checkbox);
          checkboxDiv.appendChild(label);
          checklistContainer.appendChild(checkboxDiv);
        });

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        // Create Skip Step button
        const skipButton = document.createElement('button');
        skipButton.textContent = 'Skip Step';
        skipButton.className = 'skip-button';
        
        // Create Delete Columns button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Columns';
        deleteButton.className = 'delete-button';

        // Add buttons to container
        buttonsContainer.appendChild(skipButton);
        buttonsContainer.appendChild(deleteButton);

        // Add checklist and buttons to options area
        optionsArea.appendChild(checklistContainer);
        optionsArea.appendChild(buttonsContainer);

        // Add this after creating the delete button:
        deleteButton.addEventListener('click', () => {
            // Get all checkboxes
            const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
            // Get checked columns to delete
            const columnsToDelete = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            if (columnsToDelete.length === 0) {
                alert('Please select columns to delete');
                return;
            }

            // Show loading spinner while processing
            loadingSpinner.hidden = false;
            blurOverlay.style.display = 'block';
            mainContent.classList.add('blurred');

            // Send delete request to server
            fetch('/delete-columns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ columns: columnsToDelete })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Update the table preview
                    csvArea.innerHTML = data.table;
                    const table = csvArea.querySelector('table');
                    if (table) {
                        table.classList.add('table', 'table-striped', 'table-bordered');
                    }

                    // Update the checklist to remove deleted columns
                    const checklistContainer = document.querySelector('.column-checklist');
                    columnsToDelete.forEach(column => {
                        const checkbox = document.querySelector(`#col-${column}`);
                        if (checkbox) {
                            checkbox.closest('.checkbox-item').remove();
                        }
                    });
                } else {
                    alert('Error deleting columns');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error deleting columns');
            })
            .finally(() => {
                // Hide loading spinner
                loadingSpinner.hidden = true;
                blurOverlay.style.display = 'none';
                mainContent.classList.remove('blurred');
            });
        });
      }
    })
    .catch(err => {
      loadingSpinner.hidden = true;
      blurOverlay.style.display = 'none';
      mainContent.classList.remove('blurred');
      alert('Error uploading file');
      console.error(err);
    });
}
