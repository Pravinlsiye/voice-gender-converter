// Global variables for recording
let mediaRecorder;
let audioChunks = [];
let recordedBlob;

// Function to toggle between tabs
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the selected tab content and set active class
    document.getElementById(tabName + 'Tab').style.display = 'block';
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Function to toggle custom pitch control visibility
function toggleCustomPitch() {
    const conversionType = document.getElementById('conversionType').value;
    const customPitchControl = document.getElementById('customPitchControl');
    
    if (conversionType === 'custom') {
        customPitchControl.style.display = 'block';
    } else {
        customPitchControl.style.display = 'none';
    }
}

// Function to upload and process audio file
async function uploadAudio() {
    const fileInput = document.getElementById('audioFile');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadLink = document.getElementById('downloadLink');
    const conversionType = document.getElementById('conversionType').value;

    if (!fileInput.files.length) {
        showError('Please select a file first');
        return;
    }

    const formData = new FormData();
    formData.append('audio', fileInput.files[0]);
    formData.append('conversion_type', conversionType);
    
    // Add custom pitch if selected
    if (conversionType === 'custom') {
        formData.append('custom_pitch', document.getElementById('customPitch').value);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            const audioUrl = `/converted/${data.filename}`;
            audioPlayer.src = audioUrl;
            downloadLink.href = audioUrl;
            downloadLink.download = data.filename;
            
            resultDiv.style.display = 'block';
            errorDiv.style.display = 'none';
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('An error occurred during upload');
    }
}

// Function to start/stop recording
async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordedAudio = document.getElementById('recordedAudio');
    const convertRecording = document.getElementById('convertRecording');
    
    // If not currently recording, start recording
    if (recordButton.textContent === 'Start Recording') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Reset audio chunks
            audioChunks = [];
            
            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);
            
            // Event handler for data available
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            // Event handler for when recording stops
            mediaRecorder.onstop = () => {
                // Create blob from audio chunks
                recordedBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                // Create URL for the blob
                const audioURL = URL.createObjectURL(recordedBlob);
                
                // Set audio source and display
                recordedAudio.src = audioURL;
                recordedAudio.style.display = 'block';
                convertRecording.style.display = 'block';
                
                // Update status
                recordingStatus.textContent = 'Recording complete';
                recordingStatus.style.color = 'green';
                
                // Stop all tracks in the stream
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            mediaRecorder.start();
            
            // Update UI
            recordButton.textContent = 'Stop Recording';
            recordingStatus.textContent = 'Recording in progress...';
            recordingStatus.style.color = 'red';
            recordedAudio.style.display = 'none';
            convertRecording.style.display = 'none';
            
        } catch (error) {
            showError('Error accessing microphone: ' + error.message);
        }
    } else {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            recordButton.textContent = 'Start Recording';
        }
    }
}

// Function to convert recorded audio
async function convertRecording() {
    if (!recordedBlob) {
        showError('No recording available');
        return;
    }
    
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadLink = document.getElementById('downloadLink');
    const conversionType = document.getElementById('conversionType').value;
    
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.wav');
    formData.append('conversion_type', conversionType);
    
    // Add custom pitch if selected
    if (conversionType === 'custom') {
        formData.append('custom_pitch', document.getElementById('customPitch').value);
    }
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const audioUrl = `/converted/${data.filename}`;
            audioPlayer.src = audioUrl;
            downloadLink.href = audioUrl;
            downloadLink.download = data.filename;
            
            resultDiv.style.display = 'block';
            errorDiv.style.display = 'none';
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('An error occurred during conversion');
    }
}

// Function to display error messages
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('result').style.display = 'none';
}

// Update pitch value display when slider changes
function updatePitchValue() {
    document.getElementById('pitchValue').textContent = document.getElementById('customPitch').value;
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('recordButton').addEventListener('click', toggleRecording);
    document.getElementById('convertRecording').addEventListener('click', convertRecording);
    document.getElementById('customPitch').addEventListener('input', updatePitchValue);
    
    // Initialize pitch value display
    updatePitchValue();
});