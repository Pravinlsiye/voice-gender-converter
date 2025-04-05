from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from werkzeug.utils import secure_filename
import librosa
import soundfile as sf
import numpy as np

app = Flask(__name__)

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CONVERTED_FOLDER'] = CONVERTED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_directories():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CONVERTED_FOLDER, exist_ok=True)

def process_audio(input_path, output_path):
    # Load the audio file
    y, sr = librosa.load(input_path)
    
    # Pitch shift up by 4 semitones (adjust this value as needed)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=4)
    
    # Save the processed audio
    sf.write(output_path, y_shifted, sr)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    ensure_directories()
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        output_filename = f'converted_{filename}'
        output_path = os.path.join(app.config['CONVERTED_FOLDER'], output_filename)
        
        try:
            file.save(input_path)
            process_audio(input_path, output_path)
            
            return jsonify({
                'message': 'File processed successfully',
                'filename': output_filename
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/converted/<filename>')
def converted_file(filename):
    return send_from_directory(app.config['CONVERTED_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)