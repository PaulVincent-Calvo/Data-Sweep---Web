from flask import Flask, render_template, request, jsonify, session
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
        if 'current_file' not in session:
            return jsonify({'error': 'No file uploaded'}), 400

        data = request.get_json()
        columns = data.get('columns', [])
        classification_type = data.get('classificationType', '')
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], session['current_file'])
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 400
            
        df = pd.read_csv(filepath)
        
        # Check specified columns for empty fields
        columns_with_empty = [col for col in columns if df[col].isna().any()]
        
        return jsonify({
            'success': True,
            'hasEmptyFields': len(columns_with_empty) > 0,
            'columnsWithEmpty': columns_with_empty,
            'classificationType': classification_type
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
            print(f"Processing {column} with {handling}")  # Debug print
            
            if handling == 'delete-empty-rows':
                df = df.dropna(subset=[column])
            
            elif handling in ['fill-mode', 'fill-mean']:
                # Get unique values and create rank mapping
                unique_values = sorted(df[column].dropna().unique())
                value_ranks = {val: idx + 1 for idx, val in enumerate(unique_values)}
                rank_values = {idx + 1: val for idx, val in enumerate(unique_values)}
                
                # Convert to numeric ranks
                numeric_series = df[column].map(value_ranks)
                
                if handling == 'fill-mode':
                    # Get most common value
                    mode_value = df[column].mode()[0]
                    df[column].fillna(mode_value, inplace=True)
                else:  # fill-mean
                    # Calculate mean of ranks
                    mean_rank = numeric_series.mean()
                    # Round to nearest rank
                    nearest_rank = round(mean_rank)
                    # Get corresponding value
                    fill_value = rank_values.get(nearest_rank, rank_values[1])  # Default to first value if out of range
                    df[column].fillna(fill_value, inplace=True)

        # Save the modified DataFrame
        df.to_csv(filepath, index=False)
        
        # Convert updated DataFrame to HTML table
        table_html = df.to_html(classes='table table-striped', index=False)
        
        return jsonify({
            'success': True,
            'table': table_html,
            'message': 'Empty categorical fields handled successfully'
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug print
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

if __name__ == '__main__':
    app.run(debug=True)
