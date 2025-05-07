import os
import sys
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['UPLOAD_FOLDER'] = 'test_uploads'
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    yield app.test_client()
    for file in os.listdir(app.config['UPLOAD_FOLDER']):
        os.remove(os.path.join(app.config['UPLOAD_FOLDER'], file))
    os.rmdir(app.config['UPLOAD_FOLDER'])

def test_upload_regular_csv(client):
    data = {
        'file': (open('tests/sample.csv', 'rb'), 'sample.csv')
    }
    response = client.post('/upload', data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    assert b"filename" in response.data
    assert b"sample.csv" in response.data

def test_upload_csv_named_csv_csv(client):
    data = {
        'file': (open('tests/csv.csv', 'rb'), 'csv.csv')
    }
    response = client.post('/upload', data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    assert b"filename" in response.data
    assert b"csv.csv" in response.data

def test_upload_invalid_file(client):
    data = {
        'file': (open('tests/sample.jpg', 'rb'), 'sample.jpg')
    }
    response = client.post('/upload', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert b"Only CSV files are accepted" in response.data