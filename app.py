from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import pandas as pd

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'csv'}

dataClassifications = ["Name", "Date", "Categorical", "Non-categorical"]

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
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

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
        data = request.get_json()
        columns_to_delete = data.get('columns', [])
        
        # Read the current CSV file
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        if not files:
            return jsonify({'error': 'No CSV file found'}), 400
            
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], files[-1])
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
        # Read the current CSV file
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        if not files:
            return jsonify({'error': 'No CSV file found'}), 400
            
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], files[-1])
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
        classification_type = data.get('classificationType', '')
        
        # Read the current CSV file
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        if not files:
            return jsonify({'error': 'No CSV file found'}), 400
            
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], files[-1])
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

if __name__ == '__main__':
    app.run(debug=True)
