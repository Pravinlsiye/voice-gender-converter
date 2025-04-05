// Global variables for audio processing
let audioContext;
let sourceNode;
let pitchShifterNode;
let isLiveActive = false;
let analyser;
let stream;

// Recording variables
let isRecording = false;
let originalRecorder;
let convertedRecorder;
let originalAudioChunks = [];
let convertedAudioChunks = [];
let originalBlob;
let convertedBlob;

// Initialize Web Audio API
async function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Get user media (microphone)
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create source node from microphone input
        sourceNode = audioContext.createMediaStreamSource(stream);
        
        // Create analyser node for visualization (optional)
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        // Connect source to analyser
        sourceNode.connect(analyser);
        
        return true;
    } catch (error) {
        document.getElementById('liveStatus').textContent = 'Error accessing microphone: ' + error.message;
        document.getElementById('liveStatus').style.color = 'red';
        return false;
    }
}

// Function to start/stop live voice changing
// In the toggleLiveVoiceChange function, add this code where you start the live voice changing

async function toggleLiveVoiceChange() {
    const button = document.getElementById('startLive');
    const statusElement = document.getElementById('liveStatus');
    
    if (!isLiveActive) {
        // Initialize audio if not already done
        if (!audioContext) {
            const initialized = await initAudio();
            if (!initialized) return;
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create ScriptProcessor for pitch shifting
        const bufferSize = 4096;
        pitchShifterNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        // Get pitch shift amount based on selected conversion type
        const conversionType = document.getElementById('liveConversionType').value;
        let pitchShift;
        
        if (conversionType === 'custom') {
            pitchShift = parseFloat(document.getElementById('livePitch').value);
        } else if (conversionType === 'male_to_female') {
            pitchShift = -4; // Shift up for male to female
        } else {
            pitchShift = 4; // Shift down for female to male
        }
        
        // Apply the pitch shifting effect
        updatePitchShifter(pitchShift);
        
        // Connect nodes: source -> pitchShifter -> destination
        // Fix echo issue by not connecting analyser to destination
        sourceNode.disconnect(analyser);
        sourceNode.connect(pitchShifterNode);
        pitchShifterNode.connect(audioContext.destination);
        // Only connect analyser for visualization, not to audio output
        sourceNode.connect(analyser);
        
        // Update UI
        button.textContent = 'Stop Live Voice Change';
        statusElement.textContent = 'Live voice changing active';
        statusElement.style.color = 'green';
        isLiveActive = true;
        
        // Check if auto-record is enabled and start recording if it is
        if (document.getElementById('autoRecord').checked) {
            // Only start recording if not already recording
            if (!isRecording) {
                toggleLiveRecording();
            }
        }
        
    } else {
        // Disconnect and clean up
        if (pitchShifterNode) {
            sourceNode.disconnect(pitchShifterNode);
            pitchShifterNode.disconnect(audioContext.destination);
            sourceNode.connect(analyser);
        }
        
        // Stop all tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Stop recording if it's active and auto-record was enabled
        if (isRecording && document.getElementById('autoRecord').checked) {
            toggleLiveRecording();
        }
        
        // Update UI
        button.textContent = 'Start Live Voice Change';
        statusElement.textContent = 'Live voice changing stopped';
        statusElement.style.color = 'blue';
        isLiveActive = false;
    }
}

// Modify the toggleLiveRecording function to improve audio quality
function toggleLiveRecording() {
    const recordButton = document.getElementById('recordLive');
    const recordingStatus = document.getElementById('liveRecordingStatus');
    
    if (!isRecording) {
        if (!isLiveActive) {
            alert('Please start live voice changing first');
            return;
        }
        
        // Start recording both original and converted audio
        isRecording = true;
    
        
        // Record original audio from microphone
        originalRecorder = new MediaRecorder(stream);
        originalAudioChunks = [];
        originalRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                originalAudioChunks.push(event.data);
            }
        };
        originalRecorder.onstop = () => {
            originalBlob = new Blob(originalAudioChunks, { type: 'audio/wav' });
            document.getElementById('originalAudio').src = URL.createObjectURL(originalBlob);
            document.getElementById('originalAudioContainer').style.display = 'block';
            
            // Auto download if auto-record is enabled
            if (document.getElementById('autoRecord').checked) {
                downloadOriginalAudio();
            }
        };
        originalRecorder.start();
        
        // Record converted audio from output
        // Create a separate destination for recording to avoid feedback
        const convertedStream = audioContext.createMediaStreamDestination();
        // Connect the pitch shifter to the recording destination without affecting the main output
        pitchShifterNode.connect(convertedStream);
        
        convertedRecorder = new MediaRecorder(convertedStream.stream);
        convertedAudioChunks = [];
        convertedRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                convertedAudioChunks.push(event.data);
            }
        };
        convertedRecorder.onstop = () => {
            convertedBlob = new Blob(convertedAudioChunks, { type: 'audio/wav' });
            document.getElementById('convertedAudio').src = URL.createObjectURL(convertedBlob);
            document.getElementById('convertedAudioContainer').style.display = 'block';
            
            // Auto download if auto-record is enabled
            if (document.getElementById('autoRecord').checked) {
                downloadConvertedAudio();
            }
        };
        convertedRecorder.start();
        
        // Update UI
        recordButton.textContent = 'Stop Recording';
        recordingStatus.textContent = 'Recording in progress...';
        recordingStatus.style.color = 'red';
        
    } else {
        // Stop recording
        if (originalRecorder && originalRecorder.state !== 'inactive') {
            originalRecorder.stop();
        }
        if (convertedRecorder && convertedRecorder.state !== 'inactive') {
            convertedRecorder.stop();
        }
        
        // Update UI
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordingStatus.textContent = 'Recording stopped';
        recordingStatus.style.color = 'blue';
    }
}

// Function to update live effect based on selection
function updateLiveEffect() {
    const conversionType = document.getElementById('liveConversionType').value;
    const livePitchControl = document.getElementById('livePitchControl');
    
    if (conversionType === 'custom') {
        livePitchControl.style.display = 'block';
    } else {
        livePitchControl.style.display = 'none';
    }
    
    // If live processing is active, update the pitch shift without stopping/starting
    if (isLiveActive && pitchShifterNode) {
        // Get new pitch shift amount based on selected conversion type
        let pitchShift;
        
        if (conversionType === 'custom') {
            pitchShift = parseFloat(document.getElementById('livePitch').value);
        } else if (conversionType === 'male_to_female') {
            pitchShift = -4; // Shift up for male to female
        } else {
            pitchShift = 4; // Shift down for female to male
        }
        
        // Update the pitch shifter node with new pitch value
        updatePitchShifter(pitchShift);
    }
}

// Function to update pitch shifter with new value
function updatePitchShifter(pitchShift) {
    if (!pitchShifterNode) return;
    
    // Update the onaudioprocess handler with the new pitch value
    pitchShifterNode.onaudioprocess = function(audioProcessingEvent) {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const outputBuffer = audioProcessingEvent.outputBuffer;
        
        // Simple pitch shifting by resampling
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);
            
            // Pitch shift factor (1.0 = no change, 0.5 = octave down, 2.0 = octave up)
            const pitchFactor = Math.pow(2, pitchShift / 12);
            
            for (let i = 0; i < inputBuffer.length; i++) {
                // Simple resampling
                const readIndex = i / pitchFactor;
                const readIndexFloor = Math.floor(readIndex);
                const readIndexCeil = Math.ceil(readIndex);
                const fraction = readIndex - readIndexFloor;
                
                // Linear interpolation
                if (readIndexCeil < inputBuffer.length) {
                    outputData[i] = inputData[readIndexFloor] * (1 - fraction) + 
                                    inputData[readIndexCeil] * fraction;
                } else {
                    outputData[i] = 0;
                }
            }
        }
    };
}

// Update pitch value display when slider changes
function updateLivePitchValue() {
    document.getElementById('livePitchValue').textContent = document.getElementById('livePitch').value;
}

// Function to start/stop recording the live session
function toggleLiveRecording() {
    const recordButton = document.getElementById('recordLive');
    const recordingStatus = document.getElementById('liveRecordingStatus');
    
    if (!isRecording) {
        if (!isLiveActive) {
            alert('Please start live voice changing first');
            return;
        }
        
        // Start recording both original and converted audio
        isRecording = true;
        
        // Record original audio from microphone
        originalRecorder = new MediaRecorder(stream);
        originalAudioChunks = [];
        originalRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                originalAudioChunks.push(event.data);
            }
        };
        originalRecorder.onstop = () => {
            originalBlob = new Blob(originalAudioChunks, { type: 'audio/wav' });
            document.getElementById('originalAudio').src = URL.createObjectURL(originalBlob);
            document.getElementById('originalAudioContainer').style.display = 'block';
        };
        originalRecorder.start();
        
        // Record converted audio from output
        const convertedStream = audioContext.createMediaStreamDestination();
        pitchShifterNode.connect(convertedStream);
        
        convertedRecorder = new MediaRecorder(convertedStream.stream);
        convertedAudioChunks = [];
        convertedRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                convertedAudioChunks.push(event.data);
            }
        };
        convertedRecorder.onstop = () => {
            convertedBlob = new Blob(convertedAudioChunks, { type: 'audio/wav' });
            document.getElementById('convertedAudio').src = URL.createObjectURL(convertedBlob);
            document.getElementById('convertedAudioContainer').style.display = 'block';
        };
        convertedRecorder.start();
        
        // Update UI
        recordButton.textContent = 'Stop Recording';
        recordingStatus.textContent = 'Recording in progress...';
        recordingStatus.style.color = 'red';
        
    } else {
        // Stop recording
        if (originalRecorder && originalRecorder.state !== 'inactive') {
            originalRecorder.stop();
        }
        if (convertedRecorder && convertedRecorder.state !== 'inactive') {
            convertedRecorder.stop();
        }
        
        // Update UI
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordingStatus.textContent = 'Recording stopped';
        recordingStatus.style.color = 'blue';
    }
}

// Function to download original audio
function downloadOriginalAudio() {
    if (!originalBlob) {
        alert('No original audio available to download');
        return;
    }
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(originalBlob);
    downloadLink.download = 'original_audio.wav';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Function to download converted audio
function downloadConvertedAudio() {
    if (!convertedBlob) {
        alert('No converted audio available to download');
        return;
    }
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(convertedBlob);
    downloadLink.download = 'converted_audio.wav';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Function to clear original audio
function clearOriginalAudio() {
    originalBlob = null;
    originalAudioChunks = [];
    document.getElementById('originalAudio').src = '';
    document.getElementById('originalAudioContainer').style.display = 'none';
}

// Function to clear converted audio
function clearConvertedAudio() {
    convertedBlob = null;
    convertedAudioChunks = [];
    document.getElementById('convertedAudio').src = '';
    document.getElementById('convertedAudioContainer').style.display = 'none';
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('startLive').addEventListener('click', toggleLiveVoiceChange);
    document.getElementById('liveConversionType').addEventListener('change', updateLiveEffect);
    document.getElementById('livePitch').addEventListener('input', function() {
        updateLivePitchValue();
        if (isLiveActive) {
            // Update pitch value without restarting
            const pitchShift = parseFloat(document.getElementById('livePitch').value);
            updatePitchShifter(pitchShift);
        }
    });
    
    // Add recording event listeners
    document.getElementById('recordLive').addEventListener('click', toggleLiveRecording);
    document.getElementById('downloadOriginal').addEventListener('click', downloadOriginalAudio);
    document.getElementById('downloadConverted').addEventListener('click', downloadConvertedAudio);
    document.getElementById('clearOriginal').addEventListener('click', clearOriginalAudio);
    document.getElementById('clearConverted').addEventListener('click', clearConvertedAudio);
    
    // Initialize pitch value display
    updateLivePitchValue();
});