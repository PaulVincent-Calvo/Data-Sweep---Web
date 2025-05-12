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

function showErrorPopup(message) {
    const popup = document.getElementById('error-popup');
    const errorMessage = document.getElementById('error-message');
    const closeBtn = popup.querySelector('.popup-close');
    
    errorMessage.textContent = message;
    popup.style.display = 'block';

    closeBtn.onclick = function() {
        popup.style.display = 'none';
    }

    // Close on outside click
    window.onclick = function(event) {
        if (event.target == popup) {
            popup.style.display = 'none';
        }
    }
}

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
        console.log(data.error);
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
          checkbox.checked = false; 

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
                console.log('Please select columns to delete');
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
                    if (data.error.includes('Cannot delete all columns')) {
                        showErrorPopup('You must keep at least one column in the table');
                    } else if (data.error.includes('No data rows remaining')) {
                        showErrorPopup('Cannot delete all rows from the table');
                    } else {
                        showErrorPopup('Error deleting columns');
                    }
                }
            })
            .finally(() => {
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
        console.log(`Error loading classification interface: ${err.message}`);
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
        console.log('Please classify all columns before submitting');
        return;
    }

    // Show loading spinner
    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

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
                .filter(([_, type]) => type === 'Non-categorical')
                .map(([column]) => column);

            const dateColumns = Object.entries(classifications)
                .filter(([_, type]) => type === 'Date')
                .map(([column]) => column);

            const categoricalColumns = Object.entries(classifications)
                .filter(([_, type]) => type === 'Categorical')
                .map(([column]) => column);

            const numericalColumns = Object.entries(classifications)
                .filter(([_, type]) => type === 'Numerical')
                .map(([column]) => column);

            // Store all columns for later use
            sessionStorage.setItem('remainingNameColumns', JSON.stringify(nameColumns));
            sessionStorage.setItem('remainingDateColumns', JSON.stringify(dateColumns));
            sessionStorage.setItem('remainingCategoricalColumns', JSON.stringify(categoricalColumns));
            sessionStorage.setItem('remainingNumericalColumns', JSON.stringify(numericalColumns));

            // Start with non-categorical empty fields
            if (nameColumns.length > 0) {
                checkEmptyFields(nameColumns, 'Non-categorical')
                    .then(data => {
                        if (data.hasEmptyFields) {
                            handleNonCategoricalData(nameColumns, true);  // true indicates starting with empty fields
                        } else {
                            // If no empty fields, go straight to formatting
                            handleNonCategoricalData(nameColumns, false);
                        }
                    });
            } else if (dateColumns.length > 0) {
                checkEmptyFields(dateColumns, 'Date')
                    .then(data => {
                        if (data.hasEmptyFields) {
                            handleDateData(dateColumns, true);
                        } else {
                            handleDateData(dateColumns, false);
                        }
                    });
            } else if (categoricalColumns.length > 0) {
                handleCategoricalData(categoricalColumns);
            } else if (numericalColumns.length > 0) {
                handleNumericalData(numericalColumns);
            }
        } else {
            throw new Error(data.error || 'Failed to submit classifications');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
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

function createOptionsContainer(title, columns, options, handleSubmit, submitButtonText) {
    const container = document.createElement('div');
    container.className = 'options-container';
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'format-options';

    const formatTitle = document.createElement('h3');
    formatTitle.textContent = title;
    optionsDiv.appendChild(formatTitle);

    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';

    columns.forEach(column => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column-item';

        const columnNameDiv = document.createElement('div');
        columnNameDiv.className = 'column-name';

        const columnName = document.createElement('p');
        columnName.textContent = column;
        columnNameDiv.appendChild(columnName);
        columnDiv.appendChild(columnNameDiv);

        const select = document.createElement('select');
        select.className = 'format-select';
        // Create a safe ID by replacing spaces and special characters
        const safeColumnId = column.replace(/[^a-zA-Z0-9]/g, '_');
        select.id = `format-${safeColumnId}`;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        columnDiv.appendChild(select);
        optionsList.appendChild(columnDiv);
    });

    optionsDiv.appendChild(optionsList);
    container.appendChild(optionsDiv);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'submit-button-container'; // Change from 'button-container' to 'submit-button-container'
    
    const submitButton = document.createElement('button');
    submitButton.textContent = submitButtonText;
    submitButton.className = 'submit-button';
    submitButton.addEventListener('click', handleSubmit);

    buttonContainer.appendChild(submitButton);
    container.appendChild(buttonContainer);

    return container;
}

// Update handling of non-categorical data
function handleNonCategoricalData(columns, classifications) {
    checkEmptyFields(columns, 'Non-categorical')
        .then(data => {
            const optionsArea = document.querySelector('.options-area');
            optionsArea.innerHTML = '';

            const optionsWrapper = document.createElement('div');
            optionsWrapper.className = 'options-wrapper';

            const formatContainer = createFormatContainer(columns, true);

            if (data.hasEmptyFields) {
                const emptyFieldsOptions = [
                    { value: 'delete-empty-rows', label: 'Delete empty rows' },
                    { value: 'fill-none', label: 'Fill with "None"' },
                    { value: 'fill-unknown', label: 'Fill with "Unknown"' },
                    { value: 'fill-na', label: 'Fill with "N/A"' }
                ];

                const emptyContainer = createOptionsContainer(
                    'Handle Empty Non-Categorical Rows',
                    data.columnsWithEmpty,
                    emptyFieldsOptions,
                    () => handleEmptyFieldSubmit(data.columnsWithEmpty, 'Non-categorical', formatContainer),
                    'Apply Empty Field Handling'
                );
                optionsWrapper.appendChild(emptyContainer);
                optionsWrapper.appendChild(formatContainer);
            } else {
                formatContainer.style.display = 'block';
                optionsWrapper.appendChild(formatContainer);
            }

            optionsArea.appendChild(optionsWrapper);
        });
}

// Update handling of date data
function handleDateData(columns, classifications) {
    checkEmptyFields(columns, 'Date')
        .then(data => {
            const optionsArea = document.querySelector('.options-area');
            optionsArea.innerHTML = '';

            const optionsWrapper = document.createElement('div');
            optionsWrapper.className = 'options-wrapper';

            // Create format container first
            const formatContainer = createDateFormatContainer(columns, true);

            if (data.hasEmptyFields) {
                const emptyFieldsOptions = [
                    { value: 'delete-empty-rows', label: 'Delete empty rows' },
                    { value: 'fill-current-date', label: 'Fill with current date' },
                    { value: 'fill-na', label: 'Fill with "N/A"' }
                ];

                const emptyContainer = createOptionsContainer(
                    'Handle Empty Date Rows',
                    data.columnsWithEmpty,
                    emptyFieldsOptions,
                    () => handleEmptyFieldSubmit(data.columnsWithEmpty, 'Date', formatContainer),
                    'Apply Empty Field Handling'
                );
                optionsWrapper.appendChild(emptyContainer);
                optionsWrapper.appendChild(formatContainer);
            } else {
                formatContainer.style.display = 'block';
                optionsWrapper.appendChild(formatContainer);
            }

            optionsArea.appendChild(optionsWrapper);
        });
}

// Update the handleEmptyFieldSubmit function
function handleEmptyFieldSubmit(columns, type, formatContainer) {
    const selections = {};
    columns.forEach(column => {
        const select = document.querySelector(`#format-${column}`);
        if (select) {
            selections[column] = select.value;
        }
    });

    // Show loading spinner
    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    // Remove categorical endpoint
    const endpoint = type === 'Date' ? '/handle-empty-date-fields' : '/handle-empty-fields';

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selections })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Update table
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            
            // Check if all data was deleted
            if (!table || !table.rows || table.rows.length <= 1) { // Only header row or no rows
                // Show warning and reload page
                console.log('All data has been deleted. Returning to upload page...');
                setTimeout(() => {
                    location.reload();
                }, 2000);
                return;
            }

            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            // Remove the empty fields container entirely instead of hiding it
            const optionsWrapper = document.querySelector('.options-wrapper');
            const containers = optionsWrapper.querySelectorAll('.options-container');
            if (containers.length > 0) {
                containers[0].remove();
            }

            // Show the format container
            if (formatContainer) {
                formatContainer.style.display = 'flex';
            }
        } else {
            throw new Error(data.error || 'Failed to handle empty fields');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function handleFormatSubmit(columns, type) {
    const selections = {};
    columns.forEach(column => {
        const safeColumnId = column.replace(/[^a-zA-Z0-9]/g, '_');
        const select = document.querySelector(`#format-${safeColumnId}`);
        if (select) {
            selections[column] = select.value;
        }
    });

    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    let endpoint;
    if (type === 'Date') {
        endpoint = '/apply-date-formats';
    } else if (type === 'Categorical') {
        endpoint = '/apply-categorical-formats';
    } else {
        endpoint = '/apply-formats';
    }

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selections })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            
            // Check if all data was deleted
            if (!table || !table.rows || table.rows.length <= 1) {
                console.log('No data remaining after processing. Returning to upload page...');
                setTimeout(() => {
                    location.reload();
                }, 2000);
                return;
            }

            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            // Remove the options wrapper
            const optionsWrapper = document.querySelector('.options-wrapper');
            if (optionsWrapper) {
                optionsWrapper.remove();
            }

            // Remove the processed columns from storage
            if (type === 'Non-categorical') {
                sessionStorage.setItem('remainingNameColumns', '[]');
            } else if (type === 'Date') {
                sessionStorage.setItem('remainingDateColumns', '[]');
            } else if (type === 'Categorical') {
                sessionStorage.setItem('remainingCategoricalColumns', '[]');
            }

            // Check if all processing is complete
            if (!checkAllProcessingComplete()) {
                // Continue with the existing chain logic
                const dateColumns = JSON.parse(sessionStorage.getItem('remainingDateColumns') || '[]');
                if (type === 'Non-categorical' && dateColumns.length > 0) {
                    checkEmptyFields(dateColumns, 'Date')
                        .then(data => {
                            if (data.hasEmptyFields) {
                                handleDateData(dateColumns, true);
                            } else {
                                handleDateData(dateColumns, false);
                            }
                        });
                } else if (type === 'Date') {
                    const categoricalColumns = JSON.parse(sessionStorage.getItem('remainingCategoricalColumns') || '[]');
                    if (categoricalColumns.length > 0) {
                        handleCategoricalData(categoricalColumns);
                    } else {
                        const numericalColumns = JSON.parse(sessionStorage.getItem('remainingNumericalColumns') || '[]');
                        if (numericalColumns.length > 0) {
                            handleNumericalData(numericalColumns);
                        }
                    }
                } else if (type === 'Categorical') {
                    fetch('/get-unique-values', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ columns })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            handleCategoricalStandardization(columns);
                        }
                    });
                }
            }

            console.log(`${type} formatting applied successfully!`);
        } else {
            throw new Error(data.error || `Failed to apply ${type.toLowerCase()} formats`);
        }
    })
    .catch(err => {
        console.log(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function createFormatContainer(columns, hidden) {
    const formatOptions = [
        { value: 'uppercase', label: 'UPPERCASE' },
        { value: 'lowercase', label: 'lowercase' },
        { value: 'title-case', label: 'Title Case' },
        { value: 'sentence-case', label: 'Sentence case' }
    ];

    const container = createOptionsContainer(
        'Format Non-categorical Columns',
        columns,
        formatOptions,
        () => handleFormatSubmit(columns, 'Non-categorical'),
        'Apply Format'
    );

    if (hidden) {
        container.style.display = 'none';
    }

    return container;
}

function createDateFormatContainer(columns, hidden) {
    const dateFormatOptions = [
        { value: '', label: 'Select date format' }, // Add default option
        { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
        { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
        { value: 'yyyy/mm/dd', label: 'YYYY/MM/DD' }
    ];

    const container = createOptionsContainer(
        'Format Date Columns',
        columns,
        dateFormatOptions,
        () => handleFormatSubmit(columns, 'Date'),
        'Apply Date Format'
    );

    if (hidden) {
        container.style.display = 'none';
    }

    return container;
}

function handleCategoricalData(columns, classifications) {
    const optionsArea = document.querySelector('.options-area');
    optionsArea.innerHTML = '';

    const optionsWrapper = document.createElement('div');
    optionsWrapper.className = 'options-wrapper';

    // Create format container and show it immediately
    const formatContainer = createCategoricalFormatContainer(columns, false);
    optionsWrapper.appendChild(formatContainer);
    optionsArea.appendChild(optionsWrapper);
}

function createCategoricalFormatContainer(columns, hidden) {
    const formatOptions = [
        { value: 'uppercase', label: 'UPPERCASE' },
        { value: 'lowercase', label: 'lowercase' },
        { value: 'title-case', label: 'Title Case' },
        { value: 'sentence-case', label: 'Sentence case' }
    ];

    const container = createOptionsContainer(
        'Format Categorical Values',
        columns,
        formatOptions,
        () => handleFormatSubmit(columns, 'Categorical'),
        'Apply Format'
    );

    if (hidden) {
        container.style.display = 'none';
    }

    return container;
}

function handleCategoricalStandardization(columns) {
    fetch('/get-unique-values', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ columns })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const optionsArea = document.querySelector('.options-area');
            optionsArea.innerHTML = '';

            const optionsWrapper = document.createElement('div');
            optionsWrapper.className = 'options-wrapper';

            const container = createStandardizationContainer(columns, data.uniqueValues);
            optionsWrapper.appendChild(container);
            optionsArea.appendChild(optionsWrapper);
        }
    });
}

function createStandardizationContainer(columns, uniqueValues) {
    const container = document.createElement('div');
    container.className = 'options-container';

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'format-options';

    const title = document.createElement('h3');
    title.textContent = 'Standardize Categorical Values';
    optionsDiv.appendChild(title);

    const columnsList = document.createElement('div');
    columnsList.className = 'options-list';

    columns.forEach(column => {
        const columnSection = document.createElement('div');
        columnSection.className = 'column-section';

        const columnTitle = document.createElement('h4');
        columnTitle.textContent = column;
        columnSection.appendChild(columnTitle);

        const uniqueList = document.createElement('div');
        uniqueList.className = 'unique-values-list';

        uniqueValues[column].forEach(value => {
            const valueDiv = document.createElement('div');
            valueDiv.className = 'value-item';

            const valueText = document.createElement('p');
            valueText.textContent = value;
            valueDiv.appendChild(valueText);

            const select = document.createElement('select');
            select.className = 'standardize-select';
            select.id = `standardize-${column}-${value}`;

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select standard value';
            select.appendChild(defaultOption);

            // Add all unique values as options
            uniqueValues[column].forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                select.appendChild(option);
            });

            valueDiv.appendChild(select);
            uniqueList.appendChild(valueDiv);
        });

        columnSection.appendChild(uniqueList);
        columnsList.appendChild(columnSection);
    });

    optionsDiv.appendChild(columnsList);
    container.appendChild(optionsDiv);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'submit-button-container';

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Apply Standardization';
    submitButton.className = 'submit-button';
    submitButton.onclick = () => handleStandardizationSubmit(columns, uniqueValues);

    buttonContainer.appendChild(submitButton);
    container.appendChild(buttonContainer);

    return container;
}

function handleStandardizationSubmit(columns, uniqueValues) {
    const standardizations = {};

    columns.forEach(column => {
        standardizations[column] = {};
        uniqueValues[column].forEach(value => {
            const select = document.querySelector(`#standardize-${column}-${value}`);
            if (select && select.value) {
                standardizations[column][value] = select.value;
            }
        });
    });

    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    fetch('/apply-standardization', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ standardizations })
    })
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                // Try to parse as JSON first
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || 'Server error');
                } catch (e) {
                    // If not JSON, it's probably HTML error page
                    throw new Error('Server error occurred');
                }
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            const optionsWrapper = document.querySelector('.options-wrapper');
            if (optionsWrapper) {
                optionsWrapper.remove();
            }

            // Check for empty fields after standardization
            checkEmptyFields(columns, 'Categorical')
                .then(data => {
                    if (data.hasEmptyFields) {
                        handleCategoricalEmptyFields(columns);
                    } else {
                        // If no empty fields, move to numerical data
                        const numericalColumns = JSON.parse(sessionStorage.getItem('remainingNumericalColumns') || '[]');
                        if (numericalColumns.length > 0) {
                            handleNumericalData(numericalColumns);
                        }
                    }
                });

            console.log('Standardization applied successfully!');
        } else {
            throw new Error(data.error || 'Failed to apply standardization');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function handleCategoricalEmptyFields(columns) {
    checkEmptyFields(columns, 'Categorical')
        .then(data => {
            const optionsArea = document.querySelector('.options-area');
            const newOptionsWrapper = document.createElement('div');
            newOptionsWrapper.className = 'options-wrapper';

            if (data.hasEmptyFields) {
                const emptyFieldsOptions = [
                    { value: 'delete-empty-rows', label: 'Delete empty rows' },
                    { value: 'fill-mode', label: 'Fill with mode' },
                    { value: 'fill-mean', label: 'Fill with mean' }
                ];

                const emptyContainer = createOptionsContainer(
                    'Handle Empty Categorical Fields',
                    data.columnsWithEmpty,
                    emptyFieldsOptions,
                    () => handleCategoricalEmptyFieldSubmit(data.columnsWithEmpty),
                    'Apply Empty Field Handling'
                );

                newOptionsWrapper.appendChild(emptyContainer);
                optionsArea.appendChild(newOptionsWrapper);
            } else {
                const completionMessage = document.createElement('div');
                completionMessage.className = 'completion-message';
                completionMessage.textContent = 'Categorical data processing complete!';
                optionsArea.appendChild(completionMessage);
            }
        });
}

function handleCategoricalEmptyFieldSubmit(columns) {
    const selections = {};
    columns.forEach(column => {
        // Fix: Use the correct ID format and handle special characters
        const safeColumnId = column.replace(/[^a-zA-Z0-9]/g, '_');
        const select = document.querySelector(`#format-${safeColumnId}`);
        if (select) {
            selections[column] = select.value;
        }
    });

    // Show loading spinner
    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    // Make the API call
    fetch('/handle-empty-categorical-fields', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selections })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.error || 'Server error occurred');
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            // Update table
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            // Remove the options container
            const optionsWrapper = document.querySelector('.options-wrapper');
            if (optionsWrapper) {
                optionsWrapper.remove();
            }

            // Instead of showing completion message, move to numerical data
            const numericalColumns = JSON.parse(sessionStorage.getItem('remainingNumericalColumns') || '[]');
            if (numericalColumns.length > 0) {
                handleNumericalData(numericalColumns);
            }

            console.log('Empty fields handled successfully!');
        } else {
            throw new Error(data.error || 'Failed to handle empty fields');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function handleNumericalData(columns) {
    const optionsArea = document.querySelector('.options-area');
    optionsArea.innerHTML = '';

    const optionsWrapper = document.createElement('div');
    optionsWrapper.className = 'options-wrapper';

    // Updated rounding options with new "Keep original" option
    const roundingOptions = [
        { value: '', label: 'Select rounding precision' }, // Default option
        { value: 'keep', label: 'Keep original numbers' },
        { value: 'whole', label: 'Round to nearest whole number' },
        { value: 'tenths', label: 'Round to nearest tenth (0.1)' },
        { value: 'hundredths', label: 'Round to nearest hundredth (0.01)' },
        { value: 'thousandths', label: 'Round to nearest thousandth (0.001)' },
        { value: 'ten-thousandths', label: 'Round to nearest ten-thousandth (0.0001)' }
    ];

    const roundingContainer = createOptionsContainer(
        'Round Numerical Values',
        columns,
        roundingOptions,
        () => handleRoundingSubmit(columns),
        'Apply Rounding'
    );

    const selects = roundingContainer.querySelectorAll('.format-select');
    selects.forEach(select => {
        select.style.width = '300px';
    });

    optionsWrapper.appendChild(roundingContainer);
    optionsArea.appendChild(optionsWrapper);
}

function handleRoundingSubmit(columns) {
    const selections = {};
    columns.forEach(column => {
        const safeColumnId = column.replace(/[^a-zA-Z0-9]/g, '_');
        const select = document.querySelector(`#format-${safeColumnId}`);
        if (select) {
            selections[column] = select.value;
        }
    });

    if (Object.values(selections).some(val => !val)) {
        console.log('Please select rounding precision for all columns');
        return;
    }

    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    fetch('/apply-numerical-rounding', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selections })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.error || 'Server error occurred');
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            const optionsWrapper = document.querySelector('.options-wrapper');
            if (optionsWrapper) {
                optionsWrapper.remove();
            }

            checkEmptyFields(columns, 'Numerical')
                .then(data => {
                    if (data.hasEmptyFields) {
                        handleNumericalEmptyFields(columns);
                    } else {
                        sessionStorage.setItem('remainingNumericalColumns', '[]');
                        checkAllProcessingComplete();
                    }
                });

            console.log('Numerical formatting applied successfully!');
        } else {
            throw new Error(data.error || 'Failed to apply numerical formatting');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

function handleNumericalEmptyFields(columns) {
    checkEmptyFields(columns, 'Numerical')
        .then(data => {
            const optionsArea = document.querySelector('.options-area');
            const newOptionsWrapper = document.createElement('div');
            newOptionsWrapper.className = 'options-wrapper';

            if (data.hasEmptyFields) {
                const emptyFieldsOptions = [
                    { value: 'delete-empty-rows', label: 'Delete empty rows' },
                    { value: 'fill-mean', label: 'Fill with mean' },
                    { value: 'fill-median', label: 'Fill with median' },
                    { value: 'fill-mode', label: 'Fill with mode' }
                ];

                const emptyContainer = createOptionsContainer(
                    'Handle Empty Numerical Fields',
                    data.columnsWithEmpty,
                    emptyFieldsOptions,
                    () => handleNumericalEmptyFieldSubmit(data.columnsWithEmpty),
                    'Apply Empty Field Handling'
                );

                newOptionsWrapper.appendChild(emptyContainer);
                optionsArea.appendChild(newOptionsWrapper);
            } else {
                const completionMessage = document.createElement('div');
                completionMessage.className = 'completion-message';
                completionMessage.textContent = 'Numerical data processing complete!';
                optionsArea.appendChild(completionMessage);
            }
        });
}

function handleNumericalEmptyFieldSubmit(columns) {
    const selections = {};
    columns.forEach(column => {
        const safeColumnId = column.replace(/[^a-zA-Z0-9]/g, '_');
        const select = document.querySelector(`#format-${safeColumnId}`);
        if (select) {
            selections[column] = select.value;
        }
    });

    loadingSpinner.hidden = false;
    blurOverlay.style.display = 'block';
    mainContent.classList.add('blurred');

    fetch('/handle-empty-numerical-fields', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selections })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.error || 'Server error occurred');
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            // Update table
            csvArea.innerHTML = data.table;
            const table = csvArea.querySelector('table');
            if (table) {
                table.classList.add('table', 'table-striped', 'table-bordered');
            }

            // Remove the options container
            const optionsWrapper = document.querySelector('.options-wrapper');
            if (optionsWrapper) {
                optionsWrapper.remove();
            }

            // Clear numerical columns from storage
            sessionStorage.setItem('remainingNumericalColumns', '[]');

            // Check if all processing is complete
            checkAllProcessingComplete();

            console.log('Empty fields handled successfully!');
        } else {
            throw new Error(data.error || 'Failed to handle empty fields');
        }
    })
    .catch(err => {
        alert(`Error: ${err.message}`);
    })
    .finally(() => {
        loadingSpinner.hidden = true;
        blurOverlay.style.display = 'none';
        mainContent.classList.remove('blurred');
    });
}

// Add new function for download page
function showDownloadPage() {
    const optionsArea = document.querySelector('.options-area');
    optionsArea.innerHTML = '';
    
    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'download-area';
    
    // Add download icon
    const downloadIcon = document.createElement('i');
    downloadIcon.className = 'fas fa-download download-icon';
    downloadContainer.appendChild(downloadIcon);
    
    // Add main text
    const titleText = document.createElement('h3');
    titleText.textContent = 'Your CSV file has been cleaned';
    downloadContainer.appendChild(titleText);
    
    // Add download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download File';
    downloadButton.className = 'download-button';
    downloadButton.onclick = handleDownload;
    downloadContainer.appendChild(downloadButton);
    
    // Add info text with file-support-text styling
    const infoText = document.createElement('h4');
    infoText.className = 'file-support-text';
    infoText.textContent = 'Please note that after your cleaned file has been downloaded, you will be returned to the main page and your cleaned file has been deleted from our system. Thank you';
    downloadContainer.appendChild(infoText);
    
    optionsArea.appendChild(downloadContainer);
}

function handleDownload() {
    fetch('/download-file', {
        method: 'GET'
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleaned_data.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Reset the page after download
        setTimeout(() => {
            location.reload();
        }, 1000);
    })
    .catch(err => {
        console.log('Error downloading file');
    });
}

function checkAllProcessingComplete() {
    const nameColumns = JSON.parse(sessionStorage.getItem('remainingNameColumns') || '[]');
    const dateColumns = JSON.parse(sessionStorage.getItem('remainingDateColumns') || '[]');
    const categoricalColumns = JSON.parse(sessionStorage.getItem('remainingCategoricalColumns') || '[]');
    const numericalColumns = JSON.parse(sessionStorage.getItem('remainingNumericalColumns') || '[]');

    // If all arrays are empty, all processing is complete
    if (nameColumns.length === 0 && 
        dateColumns.length === 0 && 
        categoricalColumns.length === 0 && 
        numericalColumns.length === 0) {
        showDownloadPage();
        return true;
    }
    return false;
}