from flask import Flask, render_template, request, jsonify, session, send_file, after_this_request, make_response
from werkzeug.utils import secure_filename
import os
import pandas as pd
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'csv'}
app.secret_key = 'your-secret-key-here'  # Change this to a secure random key

dataClassifications = ["Non-categorical", "Categorical", "Numerical", "Date"]

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        # Create a unique filename using timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Store the filename in session
        session['current_file'] = filename

        try:
            # Read CSV using pandas
            df = pd.read_csv(filepath)
            # Get column names
            columns = df.columns.tolist()
            # Convert DataFrame to HTML table
            table_html = df.to_html(classes='table table-striped', index=False)
            return jsonify({
                'filename': filename,
                'columns': columns,
                'table': table_html,
                'success': True
            })
        except Exception as e:
            return jsonify({'error': f'Error reading CSV: {str(e)}'}), 400

    return jsonify({'error': 'Only CSV files are accepted'}), 400

@app.route('/delete-columns', methods=['POST'])
def delete_columns():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        columns_to_delete = data.get('columns', [])
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Delete selected columns
        df = df.drop(columns=columns_to_delete)
        
        # Check if any columns remain
        if len(df.columns) == 0:
            return jsonify({
                'success': False,
                'error': 'Cannot delete all columns. At least one column must remain.'
            }), 400
            
        # Check if any rows remain
        if len(df) == 0:
            return jsonify({
                'success': False,
                'error': 'No data rows remaining after deletion.'
            }), 400
        
        # Save the modified CSV
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'columns': df.columns.tolist()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/show-classification', methods=['POST'])
def show_classification():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        return jsonify({
            'success': True,
            'columns': df.columns.tolist(),
            'classifications': dataClassifications
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/submit-classifications', methods=['POST'])
def submit_classifications():
    try:
        data = request.get_json()
        classifications = data.get('classifications', {})
        
        # Here you can process the classifications dictionary
        # For example, save to a file or database
        # The classifications dictionary will look like:
        # { "column_name": "classification_type", ... }
        
        return jsonify({
            'success': True,
            'message': 'Classifications saved successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/check-empty-fields', methods=['POST'])
def check_empty_fields():
    try:
        data = request.get_json()
        columns = data.get('columns', [])
        classificationType = data.get('classificationType', '')
        
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400
            
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        df = pd.read_csv(filepath)
        
        # For categorical data, also treat '<NA>' strings as empty values
        if classificationType == 'Categorical':
            columnsWithEmpty = []
            for column in columns:
                # Check for both NaN and '<NA>' values
                is_empty = df[column].isna() | (df[column].astype(str) == '<NA>')
                if is_empty.any():
                    columnsWithEmpty.append(column)
        else:
            # For other types, just check for NaN
            columnsWithEmpty = [col for col in columns if df[col].isna().any()]
        
        return jsonify({
            'success': True,
            'hasEmptyFields': len(columnsWithEmpty) > 0,
            'columnsWithEmpty': columnsWithEmpty
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/handle-empty-name-fields', methods=['POST'])
def handle_empty_name_fields():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        name_empty_handling = data.get('nameEmptyHandling', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each name column according to the empty handling choice
        for column, handling in name_empty_handling.items():
            if handling == 'delete-empty-rows':
                # Delete rows where this name column is empty
                df = df.dropna(subset=[column])
            elif handling == 'fill-with-"none"':
                df[column].fillna('None', inplace=True)
            elif handling == 'fill-with-"unknown"':
                df[column].fillna('Unknown', inplace=True)
            elif handling == 'fill-with-"n/a"':
                df[column].fillna('N/A', inplace=True)
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Empty name fields handled successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-name-formats', methods=['POST'])
def apply_name_formats():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        name_formats = data.get('nameFormats', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each name column according to the format choice
        for column, format_type in name_formats.items():
            # First clean up the text (remove extra spaces and handle underscores)
            df[column] = df[column].astype(str)
            df[column] = df[column].apply(lambda x: ' '.join(x.replace('_', ' ').split()))
            
            # Apply the chosen format
            if format_type == 'uppercase':
                df[column] = df[column].str.upper()
            elif format_type == 'lowercase':
                df[column] = df[column].str.lower()
            elif format_type == 'title-case':
                # Use pandas built-in title() method
                df[column] = df[column].str.title()
            elif format_type == 'sentence-case':
                # First make everything lowercase, then capitalize first character
                df[column] = df[column].str.lower().str.capitalize()
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Name formats applied successfully'
        })
        
    except Exception as e:
        print(f"Error in apply_name_formats: {str(e)}")  # Add debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-formats', methods=['POST'])
def apply_formats():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each column according to the format choice
        for column, format_type in selections.items():
            # Fill NaN values with empty string before formatting
            df[column] = df[column].fillna('')
            df[column] = df[column].astype(str)
            
            if format_type == 'uppercase':
                df[column] = df[column].str.upper()
            elif format_type == 'lowercase':
                df[column] = df[column].str.lower()
            elif format_type == 'title-case':
                df[column] = df[column].str.title()
            elif format_type == 'sentence-case':
                df[column] = df[column].str.lower().str.capitalize()
            
            # Convert empty strings back to NaN
            df[column] = df[column].replace('', pd.NA)
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Formats applied successfully'
        })
        
    except Exception as e:
        print(f"Error in apply_formats: {str(e)}")  # Add debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/handle-empty-fields', methods=['POST'])
def handle_empty_fields():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each column according to the empty handling choice
        for column, handling in selections.items():
            if handling == 'delete-empty-rows':
                df = df.dropna(subset=[column])
            elif handling == 'fill-none':
                df[column].fillna('None', inplace=True)
            elif handling == 'fill-unknown':
                df[column].fillna('Unknown', inplace=True)
            elif handling == 'fill-na':
                df[column].fillna('N/A', inplace=True)
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/handle-empty-date-fields', methods=['POST'])
def handle_empty_date_fields():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each date column according to the empty handling choice
        for column, handling in selections.items():
            if handling == 'delete-empty-rows':
                df = df.dropna(subset=[column])
            elif handling == 'fill-current-date':
                df[column].fillna(datetime.now().strftime('%Y-%m-%d'), inplace=True)
            elif handling == 'fill-na':
                df[column].fillna('N/A', inplace=True)
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-date-formats', methods=['POST'])
def apply_date_formats():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        
        df = pd.read_csv(filepath)
        
        # Process each date column
        for column, format_type in selections.items():
            try:
                # Store original values
                original_values = df[column].copy()
                
                # Convert to datetime WITHOUT formatting first
                temp_series = pd.to_datetime(df[column], format='mixed', errors='coerce')
                
                # Create mask for valid dates
                valid_dates = temp_series.notna()
                
                # Format valid dates according to selection
                format_mapping = {
                    'mm/dd/yyyy': '%m/%d/%Y',
                    'dd/mm/yyyy': '%d/%m/%Y',
                    'yyyy/mm/dd': '%Y/%m/%d',
                    'mm-dd-yyyy': '%m-%d-%Y',
                    'dd-mm-yyyy': '%d-%m-%Y',
                    'yyyy-mm-dd': '%Y-%m-%d'
                }
                
                if format_type in format_mapping:
                    pattern = format_mapping[format_type]
                    # Format only valid dates using the selected format
                    df.loc[valid_dates, column] = temp_series[valid_dates].dt.strftime(pattern)
                    
                # Keep original values for invalid dates
                df.loc[~valid_dates, column] = original_values[~valid_dates]
                
            except Exception as e:
                print(f"Error processing column {column}: {str(e)}")
                continue
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        print(f"General error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/handle-empty-categorical-fields', methods=['POST'])
def handle_empty_categorical_fields():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each column according to the empty handling choice
        for column, handling in selections.items():
            # Create mask for both NaN and '<NA>' values
            empty_mask = df[column].isna() | (df[column].astype(str) == '<NA>')
            
            if handling == 'delete-empty-rows':
                df = df.loc[~empty_mask]
            
            elif handling in ['fill-mode', 'fill-mean']:
                # Get only valid values (not NaN or '<NA>')
                valid_values = df.loc[~empty_mask, column]
                
                # Get unique values and create rank mapping
                unique_values = sorted(valid_values.unique())
                value_ranks = {val: idx + 1 for idx, val in enumerate(unique_values)}
                rank_values = {idx + 1: val for idx, val in enumerate(unique_values)}
                
                if handling == 'fill-mode':
                    # Get most common value excluding NaN and '<NA>'
                    mode_value = valid_values.mode()[0]
                    df.loc[empty_mask, column] = mode_value
                else:  # fill-mean
                    # Convert to numeric ranks
                    numeric_series = valid_values.map(value_ranks)
                    # Calculate mean of ranks
                    mean_rank = numeric_series.mean()
                    # Round to nearest rank
                    nearest_rank = round(mean_rank)
                    # Get corresponding value
                    fill_value = rank_values.get(nearest_rank, rank_values[1])
                    df.loc[empty_mask, column] = fill_value

        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-categorical-formats', methods=['POST'])
def apply_categorical_formats():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Process each column according to the format choice
        for column, format_type in selections.items():
            # Fill NaN values with empty string before formatting
            df[column] = df[column].fillna('')
            df[column] = df[column].astype(str)
            
            if format_type == 'uppercase':
                df[column] = df[column].str.upper()
            elif format_type == 'lowercase':
                df[column] = df[column].str.lower()
            elif format_type == 'title-case':
                df[column] = df[column].str.title()
            elif format_type == 'sentence-case':
                df[column] = df[column].str.lower().str.capitalize()
            
            # Convert empty strings back to NaN
            df[column] = df[column].replace('', pd.NA)
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Formats applied successfully'
        })
        
    except Exception as e:
        print(f"Error in apply_categorical_formats: {str(e)}")  # Debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/get-unique-values', methods=['POST'])
def get_unique_values():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        columns = data.get('columns', [])
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Get unique values for each column
        unique_values = {}
        for column in columns:
            unique_values[column] = sorted(df[column].dropna().unique().tolist())
            print(f"Column {column} unique values:", unique_values[column])  # Debug print
        
        return jsonify({
            'success': True,
            'uniqueValues': unique_values
        })
        
    except Exception as e:
        print(f"Error in get_unique_values: {str(e)}")  # Debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-standardization', methods=['POST'])
def apply_standardization():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data received'}), 400
            
        standardizations = data.get('standardizations', {})
        if not standardizations:
            return jsonify({'error': 'No standardizations provided'}), 400

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Apply standardizations
        for column, value_map in standardizations.items():
            # Replace values according to the mapping
            df[column] = df[column].map(lambda x: value_map.get(x, x))
        
        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Standardization applied successfully'
        })
        
    except Exception as e:
        print(f"Error in apply_standardization: {str(e)}")  # Debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/apply-numerical-rounding', methods=['POST'])
def apply_numerical_rounding():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Store rounding precision in DataFrame attributes
        if 'rounding_precision' not in df.attrs:
            df.attrs['rounding_precision'] = {}
        
        # Process each numerical column
        for column, precision in selections.items():
            try:
                # First, clean the numbers (remove non-numeric chars except decimal point and negative sign)
                def clean_number(value):
                    if pd.isna(value):
                        return value
                    # Convert to string first
                    str_val = str(value)
                    # Keep only digits, decimal point, and negative sign
                    cleaned = ''.join(c for c in str_val if c.isdigit() or c in '.-')
                    # Handle multiple decimal points or negative signs
                    if cleaned.count('.') > 1:
                        # Keep only the first decimal point
                        parts = cleaned.split('.')
                        cleaned = parts[0] + '.' + ''.join(parts[1:])
                    if cleaned.count('-') > 1:
                        # Keep only the first negative sign
                        cleaned = '-' + cleaned.replace('-', '')
                    return cleaned if cleaned else None

                # Clean and convert to numeric
                df[column] = df[column].apply(clean_number).astype(float)
                
                # Store the precision for this column
                df.attrs['rounding_precision'][column] = precision

                # Apply rounding based on selection
                if precision != 'keep':
                    rounding_map = {
                        'whole': 0,
                        'tenths': 1,
                        'hundredths': 2,
                        'thousandths': 3,
                        'ten-thousandths': 4
                    }
                    if precision in rounding_map:
                        df[column] = df[column].round(rounding_map[precision])

            except Exception as e:
                print(f"Error processing column {column}: {str(e)}")
                continue

        # Save the modified DataFrame with attributes
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/handle-empty-numerical-fields', methods=['POST'])
def handle_empty_numerical_fields():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        selections = data.get('selections', {})
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Get the previously applied rounding precision for each column
        rounding_map = {
            'whole': 0,
            'tenths': 1,
            'hundredths': 2,
            'thousandths': 3,
            'ten-thousandths': 4
        }
        
        # Process each numerical column
        for column, handling in selections.items():
            # Convert to numeric, handling any non-numeric values as NaN
            df[column] = pd.to_numeric(df[column], errors='coerce')
            
            # Get the column's current rounding precision from the DataFrame's metadata
            # If not found, default to original precision
            precision = None
            if 'rounding_precision' in df.attrs:
                precision = df.attrs['rounding_precision'].get(column)
            
            if handling == 'delete-empty-rows':
                df = df.dropna(subset=[column])
            
            elif handling == 'fill-mean':
                mean_value = df[column].mean()
                if precision is not None and precision != 'keep':
                    mean_value = round(mean_value, rounding_map.get(precision, 2))
                df[column].fillna(mean_value, inplace=True)
            
            elif handling == 'fill-median':
                median_value = df[column].median()
                if precision is not None and precision != 'keep':
                    median_value = round(median_value, rounding_map.get(precision, 2))
                df[column].fillna(median_value, inplace=True)
            
            elif handling == 'fill-mode':
                mode_value = df[column].mode()[0]
                if precision is not None and precision != 'keep':
                    mode_value = round(mode_value, rounding_map.get(precision, 2))
                df[column].fillna(mode_value, inplace=True)

        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html
        })
        
    except Exception as e:
        print(f"Error handling empty numerical fields: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/download-file', methods=['GET'])
def download_file():
    try:
        if 'current_file' not in session:
            return jsonify({'error': 'No file to download'}), 400
            
        timestamped_filename = session['current_file']
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], timestamped_filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400

        # Read the file content first
        with open(filepath, 'rb') as f:
            file_content = f.read()

        # Delete the file immediately
        try:
            os.remove(filepath)
            print(f"File deleted successfully: {filepath}")
        except Exception as e:
            print(f"Error deleting file: {str(e)}")

        # Clear the session
        session.pop('current_file', None)

        # Create response with file content
        response = make_response(file_content)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = 'attachment; filename=cleaned_data.csv'
        
        return response
        
    except Exception as e:
        print(f"Download error: {str(e)}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
