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

// Add at top of file (no import needed for browser version)
// We'll use the global RecordRTC object

// Function to download recorded audio
function downloadRecordedAudio() {
    if (!recordedBlob) {
        showError('No recording available to download');
        return;
    }
    
    // Create a temporary link element
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(recordedBlob);
    downloadLink.download = 'original_recording.mp3';
    
    // Append to body, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Function to start/stop recording
async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordedAudio = document.getElementById('recordedAudio');
    const convertRecording = document.getElementById('convertRecording');
    const downloadRecording = document.getElementById('downloadRecording');
    const clearRecording = document.getElementById('clearRecording');
    
    if (recordButton.textContent === 'Start Recording') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Initialize RecordRTC with MP3 recording
            mediaRecorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/mp3',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 44100,
                bitRate: 128
            });
            
            // Start recording
            mediaRecorder.startRecording();
            
            // Update UI
            recordButton.textContent = 'Stop Recording';
            recordingStatus.textContent = 'Recording in progress...';
            recordingStatus.style.color = 'red';
            recordedAudio.style.display = 'none';
            convertRecording.style.display = 'none';
            downloadRecording.style.display = 'none';
            clearRecording.style.display = 'none';
            
        } catch (error) {
            showError('Error accessing microphone: ' + error.message);
        }
    } else {
        // Stop recording
        if (mediaRecorder) {
            mediaRecorder.stopRecording(() => {
                // Get the recorded blob
                recordedBlob = mediaRecorder.getBlob();
                
                // Create URL for the blob
                const audioURL = URL.createObjectURL(recordedBlob);
                
                // Set audio source and display
                recordedAudio.src = audioURL;
                recordedAudio.style.display = 'block';
                downloadRecording.style.display = 'inline-block';
                clearRecording.style.display = 'inline-block';
                convertRecording.style.display = 'block';
                
                // Update status
                recordingStatus.textContent = 'Recording complete';
                recordingStatus.style.color = 'green';
                recordButton.textContent = 'Start Recording';
                
                // Stop all tracks in the stream
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            });
        }
    }
}

// Function to clear recording and reset UI
function clearRecording() {
    // Clear the recorded blob
    recordedBlob = null;
    audioChunks = [];
    
    // Reset UI elements
    const recordedAudio = document.getElementById('recordedAudio');
    const convertRecording = document.getElementById('convertRecording');
    const downloadRecording = document.getElementById('downloadRecording');
    const clearRecording = document.getElementById('clearRecording');
    const recordingStatus = document.getElementById('recordingStatus');
    
    recordedAudio.style.display = 'none';
    recordedAudio.src = '';
    convertRecording.style.display = 'none';
    downloadRecording.style.display = 'none';
    clearRecording.style.display = 'none';
    recordingStatus.textContent = 'Recording cleared';
    recordingStatus.style.color = 'blue';
    
    // Also clear the conversion result if present
    document.getElementById('result').style.display = 'none';
    document.getElementById('audioPlayer').src = '';
    document.getElementById('downloadLink').href = '';
}

// Function to clear conversion results
function clearConversionResults() {
    // Clear the conversion result
    document.getElementById('result').style.display = 'none';
    document.getElementById('audioPlayer').src = '';
    document.getElementById('downloadLink').href = '';
    document.getElementById('error').style.display = 'none';
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('recordButton').addEventListener('click', toggleRecording);
    document.getElementById('convertRecording').addEventListener('click', convertRecording);
    document.getElementById('customPitch').addEventListener('input', updatePitchValue);
    document.getElementById('downloadRecording').addEventListener('click', downloadRecordedAudio);
    document.getElementById('clearRecording').addEventListener('click', clearRecording);
    document.getElementById('clearResults').addEventListener('click', clearConversionResults);
    
    // Initialize pitch value display
    updatePitchValue();
});

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
    // Ensure we're sending an MP3 file with the correct extension
    formData.append('audio', recordedBlob, 'recording.mp3');
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
            showError(data.error || 'Conversion failed');
        }
    } catch (error) {
        showError('An error occurred during conversion: ' + error.message);
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