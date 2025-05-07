from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import pandas as pd

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'csv'}

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
            # Convert DataFrame to HTML table
            table_html = df.to_html(classes='table table-striped', index=False)
            return jsonify({
                'filename': filename,
                'table': table_html,
                'success': True
            })
        except Exception as e:
            return jsonify({'error': f'Error reading CSV: {str(e)}'}), 400

    return jsonify({'error': 'Only CSV files are accepted'}), 400

if __name__ == '__main__':
    app.run(debug=True)
