from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from werkzeug.utils import secure_filename
import librosa
import soundfile as sf
import numpy as np
from datetime import datetime, timedelta
import shutil

app = Flask(__name__)

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg'}
FILE_LIFETIME_HOURS = 24  # Files older than this will be deleted

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CONVERTED_FOLDER'] = CONVERTED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_directories():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CONVERTED_FOLDER, exist_ok=True)

def cleanup_old_files():
    cutoff_time = datetime.now() - timedelta(hours=FILE_LIFETIME_HOURS)
    for folder in [UPLOAD_FOLDER, CONVERTED_FOLDER]:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                filepath = os.path.join(folder, filename)
                file_time = datetime.fromtimestamp(os.path.getctime(filepath))
                if file_time < cutoff_time:
                    os.remove(filepath)

def process_audio(input_path, output_path, conversion_type='male_to_female', pitch_shift=None):
    y, sr = librosa.load(input_path)
    
    if pitch_shift is not None:
        n_steps = float(pitch_shift)
    else:
        n_steps = 4 if conversion_type == 'male_to_female' else -4
    
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=n_steps)
    sf.write(output_path, y_shifted, sr)

@app.route('/')
def index():
    cleanup_old_files()
    return render_template('index.html')

@app.route('/live')
def live():
    return render_template('live.html')

@app.route('/admin')
def admin():
    # Get list of uploaded files
    uploaded_files = []
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file_time = datetime.fromtimestamp(os.path.getctime(filepath))
            file_size = os.path.getsize(filepath) / 1024  # Size in KB
            uploaded_files.append({
                'name': filename,
                'path': filepath,
                'created': file_time,
                'size': round(file_size, 2)
            })
    
    # Get list of converted files
    converted_files = []
    if os.path.exists(CONVERTED_FOLDER):
        for filename in os.listdir(CONVERTED_FOLDER):
            filepath = os.path.join(CONVERTED_FOLDER, filename)
            file_time = datetime.fromtimestamp(os.path.getctime(filepath))
            file_size = os.path.getsize(filepath) / 1024  # Size in KB
            converted_files.append({
                'name': filename,
                'path': filepath,
                'created': file_time,
                'size': round(file_size, 2)
            })
    
    return render_template('admin.html', 
                          uploaded_files=sorted(uploaded_files, key=lambda x: x['created'], reverse=True),
                          converted_files=sorted(converted_files, key=lambda x: x['created'], reverse=True))

@app.route('/upload', methods=['POST'])
def upload_file():
    ensure_directories()
    cleanup_old_files()
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['audio']
    conversion_type = request.form.get('conversion_type', 'male_to_female')
    custom_pitch = request.form.get('custom_pitch')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        output_filename = f'converted_{timestamp}_{filename}'
        output_path = os.path.join(app.config['CONVERTED_FOLDER'], output_filename)
        
        try:
            file.save(input_path)
            process_audio(input_path, output_path, conversion_type, custom_pitch)
            
            return jsonify({
                'message': 'File processed successfully',
                'filename': output_filename
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/cleanup', methods=['POST'])
def cleanup():
    try:
        cleanup_old_files()
        return jsonify({'message': 'Cleanup completed successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/converted/<filename>')
def converted_file(filename):
    return send_from_directory(app.config['CONVERTED_FOLDER'], filename)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/delete/<folder>/<filename>', methods=['POST'])
def delete_file(folder, filename):
    if folder not in ['uploads', 'converted']:
        return jsonify({'error': 'Invalid folder'}), 400
    
    folder_path = app.config['UPLOAD_FOLDER'] if folder == 'uploads' else app.config['CONVERTED_FOLDER']
    file_path = os.path.join(folder_path, filename)
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({'message': f'File {filename} deleted successfully'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000,debug=True)