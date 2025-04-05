async function uploadAudio() {
    const fileInput = document.getElementById('audioFile');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadLink = document.getElementById('downloadLink');

    if (!fileInput.files.length) {
        showError('Please select a file first');
        return;
    }

    const formData = new FormData();
    formData.append('audio', fileInput.files[0]);

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

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('result').style.display = 'none';
}