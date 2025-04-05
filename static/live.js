// Global variables for audio processing
let audioContext;
let sourceNode;
let pitchShifterNode;
let isLiveActive = false;
let analyser;
let stream;

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
        // Note: ScriptProcessor is deprecated but still widely supported
        // For production, consider using AudioWorklet when better supported
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
        
        // Simple pitch shifting algorithm
        // This is a basic implementation - for better quality, consider libraries like Tuna.js
        let phase = 0;
        pitchShifterNode.onaudioprocess = function(audioProcessingEvent) {
            const inputBuffer = audioProcessingEvent.inputBuffer;
            const outputBuffer = audioProcessingEvent.outputBuffer;
            
            // Simple pitch shifting by resampling
            // This is a basic implementation and will have artifacts
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
        
        // Connect nodes: source -> pitchShifter -> destination
        sourceNode.disconnect(analyser);
        sourceNode.connect(pitchShifterNode);
        pitchShifterNode.connect(audioContext.destination);
        analyser.connect(audioContext.destination);
        
        // Update UI
        button.textContent = 'Stop Live Voice Change';
        statusElement.textContent = 'Live voice changing active';
        statusElement.style.color = 'green';
        isLiveActive = true;
        
    } else {
        // Disconnect and clean up
        if (pitchShifterNode) {
            sourceNode.disconnect(pitchShifterNode);
            pitchShifterNode.disconnect(audioContext.destination);
            analyser.disconnect(audioContext.destination);
            sourceNode.connect(analyser);
        }
        
        // Stop all tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Update UI
        button.textContent = 'Start Live Voice Change';
        statusElement.textContent = 'Live voice changing stopped';
        statusElement.style.color = 'blue';
        isLiveActive = false;
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
    
    // If live processing is active, restart it with new settings
    if (isLiveActive) {
        toggleLiveVoiceChange().then(() => {
            toggleLiveVoiceChange();
        });
    }
}

// Update pitch value display when slider changes
function updateLivePitchValue() {
    document.getElementById('livePitchValue').textContent = document.getElementById('livePitch').value;
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('startLive').addEventListener('click', toggleLiveVoiceChange);
    document.getElementById('liveConversionType').addEventListener('change', updateLiveEffect);
    document.getElementById('livePitch').addEventListener('input', function() {
        updateLivePitchValue();
        if (isLiveActive) {
            // Restart with new pitch value if already active
            toggleLiveVoiceChange().then(() => {
                toggleLiveVoiceChange();
            });
        }
    });
    
    // Initialize pitch value display
    updateLivePitchValue();
});