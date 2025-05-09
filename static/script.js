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

                    // Show classification interface
                    showClassificationInterface();
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

        // Add this to your skip button click handler
        skipButton.addEventListener('click', () => {
            showClassificationInterface();
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

// Add these functions to script.js

function showClassificationInterface() {
    // Hide loading spinner if visible
    loadingSpinner.hidden = true;
    blurOverlay.style.display = 'none';
    mainContent.classList.remove('blurred');

    fetch('/show-classification', {
        method: 'POST'
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(`Server error: ${err.error || 'Unknown error'}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }
        const optionsArea = document.querySelector('.options-area');
        optionsArea.innerHTML = ''; // Clear previous content

        // Create a wrapper div for all column classifications
        const columnListContainer = document.createElement('div');
        columnListContainer.className = 'column-list-container';

        // Create classification container
        const classificationContainer = document.createElement('div');
        classificationContainer.className = 'classification-container';

        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Classify Your Data Columns';
        classificationContainer.appendChild(title);
        
        // Add columns to the column list container
        data.columns.forEach(column => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'column-classification';

            // Create a div to wrap the column name
            const columnNameDiv = document.createElement('div');
            columnNameDiv.className = 'column-name';

            const columnName = document.createElement('p');
            columnName.textContent = column;
            columnNameDiv.appendChild(columnName); // Add p to the wrapper div
            columnDiv.appendChild(columnNameDiv); // Add wrapper div to columnDiv

            const select = document.createElement('select');
            select.id = `classification-${column}`;
            select.className = 'classification-select';

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select classification';
            defaultOption.selected = true;
            select.appendChild(defaultOption);

            // Add classification options
            data.classifications.forEach(classification => {
                const option = document.createElement('option');
                option.value = classification;
                option.textContent = classification;
                select.appendChild(option);
            });

            columnDiv.appendChild(select);
            columnListContainer.appendChild(columnDiv);
        });

        // Add column list container to classification container
        classificationContainer.appendChild(columnListContainer);

        // Create submit button container
        const submitButtonContainer = document.createElement('div');
        submitButtonContainer.className = 'submit-button-container';

        // Create submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Classifications';
        submitButton.className = 'submit-button';
        submitButton.onclick = submitClassifications;

        // Add button to container
        submitButtonContainer.appendChild(submitButton);
        classificationContainer.appendChild(submitButtonContainer);

        optionsArea.appendChild(classificationContainer);
    })
    .catch(err => {
        console.error('Classification interface error:', err);
        alert(`Error loading classification interface: ${err.message}`);
    });
}

// Add this function after showClassificationInterface()
function submitClassifications() {
    // Get all classification select elements
    const selects = document.querySelectorAll('.classification-select');
    
    // Create an object to store column classifications
    const classifications = {};
    
    // Check if all columns are classified
    let isValid = true;
    selects.forEach(select => {
        if (!select.value) {
            isValid = false;
            select.style.borderColor = 'red';
        } else {
            select.style.borderColor = '#E0E0E1';
            // Get column name from the select id (removes 'classification-' prefix)
            const columnName = select.id.replace('classification-', '');
            classifications[columnName] = select.value;
        }
    });

    if (!isValid) {
        alert('Please classify all columns before submitting');
        return;
    }

    // Show loading spinner
    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    // Send classifications to server
    fetch('/submit-classifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classifications })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const optionsArea = document.querySelector('.options-area');
            optionsArea.innerHTML = '';

            // Filter columns by classification type
            const nameColumns = Object.entries(classifications)
                .filter(([_, type]) => type === 'Name')
                .map(([column]) => column);

            if (nameColumns.length > 0) {
                // Check empty fields only for name columns
                checkEmptyFields(nameColumns, 'Name')
                    .then(data => {
                        const optionsArea = document.querySelector('.options-area');
                        optionsArea.innerHTML = '';

                        // Create format options div
                        const nameFormatDiv = document.createElement('div');
                        nameFormatDiv.className = 'name-format-options';

                        const formatTitle = document.createElement('h3');
                        formatTitle.textContent = 'Format Name Columns';
                        nameFormatDiv.appendChild(formatTitle);

                        // Add format options for each name column
                        nameColumns.forEach(column => {
                            const columnDiv = document.createElement('div');
                            columnDiv.className = 'name-column-item';

                            const label = document.createElement('span');
                            label.className = 'name-column-label';
                            label.textContent = column;

                            const select = document.createElement('select');
                            select.className = 'format-select';
                            select.id = `format-${column}`;

                            const options = ['UPPERCASE', 'lowercase', 'Title Case', 'Sentence case'];
                            options.forEach(opt => {
                                const option = document.createElement('option');
                                option.value = opt.toLowerCase().replace(' ', '-');
                                option.textContent = opt;
                                select.appendChild(option);
                            });

                            columnDiv.appendChild(label);
                            columnDiv.appendChild(select);
                            nameFormatDiv.appendChild(columnDiv);
                        });

                        // Add format submit button container
                        const formatButtonContainer = document.createElement('div');
                        formatButtonContainer.className = 'format-button-container';
                        const formatSubmitBtn = document.createElement('button');
                        formatSubmitBtn.className = 'format-submit-button';
                        formatSubmitBtn.textContent = 'Apply Format';
                        formatButtonContainer.appendChild(formatSubmitBtn);
                        nameFormatDiv.appendChild(formatButtonContainer);

                        // If there are empty fields, create empty fields options
                        if (data.hasEmptyFields) {
                            // Create empty fields options div FIRST
                            const emptyOptionsDiv = document.createElement('div');
                            emptyOptionsDiv.className = 'name-empty-options';

                            const emptyTitle = document.createElement('h3');
                            emptyTitle.textContent = 'Handle Empty Fields';
                            emptyOptionsDiv.appendChild(emptyTitle);

                            // Add empty field options for columns with empty fields
                            data.columnsWithEmpty.forEach(column => {
                                const columnDiv = document.createElement('div');
                                columnDiv.className = 'name-column-item';

                                const label = document.createElement('span');
                                label.className = 'name-column-label';
                                label.textContent = column;

                                const select = document.createElement('select');
                                select.className = 'format-select';
                                select.id = `empty-${column}`;

                                const options = ['Delete empty rows', 'Fill with "None"', 'Fill with "Unknown"', 'Fill with "N/A"'];
                                options.forEach(opt => {
                                    const option = document.createElement('option');
                                    option.value = opt.toLowerCase().replace(/ /g, '-');
                                    option.textContent = opt;
                                    select.appendChild(option);
                                });

                                columnDiv.appendChild(label);
                                columnDiv.appendChild(select);
                                emptyOptionsDiv.appendChild(columnDiv);
                            });

                            // Add empty fields submit button container
                            const emptyButtonContainer = document.createElement('div');
                            emptyButtonContainer.className = 'empty-button-container';
                            const emptySubmitBtn = document.createElement('button');
                            emptySubmitBtn.className = 'empty-submit-button';
                            emptySubmitBtn.textContent = 'Apply Empty Field Handling';
                            emptyButtonContainer.appendChild(emptySubmitBtn);
                            emptyOptionsDiv.appendChild(emptyButtonContainer);

                            // Hide format options initially
                            nameFormatDiv.style.display = 'none';

                            // Add event listener for empty fields submit
                            emptySubmitBtn.addEventListener('click', () => {
                                nameFormatDiv.style.display = 'block';
                                emptyOptionsDiv.style.display = 'none';
                            });

                            // Add empty options div first
                            optionsArea.appendChild(emptyOptionsDiv);
                        }

                        // Add format div (will be hidden if there are empty fields)
                        optionsArea.appendChild(nameFormatDiv);

                        // Add next step button
                        const nextStepBtn = document.createElement('button');
                        nextStepBtn.className = 'next-step-button';
                        nextStepBtn.textContent = 'Next Step';
                        nextStepBtn.disabled = true;
                        nextStepBtn.style.display = 'none';

                        // Add event listener for format submit
                        formatSubmitBtn.addEventListener('click', () => {
                            nextStepBtn.style.display = 'block';
                            nextStepBtn.disabled = false;
                            nameFormatDiv.style.display = 'none';
                        });

                        optionsArea.appendChild(nextStepBtn);
                    });
            }
        } else {
            throw new Error(data.error || 'Failed to submit classifications');
        }
    })
    .catch(err => {
        console.error('Error submitting classifications:', err);
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        // Hide loading spinner
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function checkEmptyFields(columns, classificationType) {
    return fetch('/check-empty-fields', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            columns: columns,
            classificationType: classificationType 
        })
    })
    .then(res => res.json());
}
